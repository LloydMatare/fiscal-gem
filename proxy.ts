import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Re-defining isPublicRoute to extract the public paths as strings.
// This is done to be compatible with `publicRoutes` option of `clerkMiddleware`.
const publicRoutesArray = [
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/fdms/verify-taxpayer",
  "/api/fdms/register-device",
  "/api/fdms/get-server-certificate",
];

export default clerkMiddleware({
  publicRoutes: publicRoutesArray
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
