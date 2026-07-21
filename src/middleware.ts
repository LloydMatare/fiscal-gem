import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/fdms/public(.*)",
  "/api/webhook(.*)",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isTenantRoute = createRouteMatcher(["/tenant(.*)"]);
const isS2sRoute = createRouteMatcher(["/api/s2s(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, orgId, orgRole, orgSlug } = await auth();

  // Public routes - no auth required
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // S2S routes use API key auth (handled in route handlers)
  if (isS2sRoute(req)) {
    return NextResponse.next();
  }

  // Protected routes require authentication
  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Admin routes require admin role in the organization
  if (isAdminRoute(req) && orgRole !== "org:admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Inject tenant context from Clerk org
  const headers = new Headers(req.headers);
  headers.set("x-clerk-user-id", userId);
  if (orgId) {
    headers.set("x-clerk-org-id", orgId);
    headers.set("x-clerk-org-slug", orgSlug || "");
    headers.set("x-clerk-org-role", orgRole || "");
  }

  return NextResponse.next({ request: { headers } });
});

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    "/((?!_next|.*\\..*|favicon\\.ico).*)",
  ],
};
