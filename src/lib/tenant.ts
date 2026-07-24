import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { clients, userAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";

export type TenantContext = {
  userId: string;
  orgId: string | null;
  orgRole: string | null;
  orgSlug: string | null;
  clientId: string | null;
  isSystemMode: boolean;
  isTenantMode: boolean;
};

export async function resolveTenantContext(): Promise<TenantContext> {
  const { userId, orgId, orgRole, orgSlug } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Check if this is the system tenant (admin mode) OR any org admin
  const isSystemMode = orgRole === "org:admin";

  // Resolve client from Clerk org
  let clientId: string | null = null;
  if (orgId && !isSystemMode) {
    const client = await db.query.clients.findFirst({
      where: eq(clients.clerkOrgId, orgId),
    });
    clientId = client?.id ?? null;
  }

  return {
    userId,
    orgId: orgId ?? null,
    orgRole: orgRole ?? null,
    orgSlug: orgSlug ?? null,
    clientId,
    isSystemMode,
    isTenantMode: !isSystemMode && clientId !== null,
  };
}

/**
 * Ensures the current user has admin access (system mode).
 */
export async function requireAdmin(): Promise<TenantContext> {
  const ctx = await resolveTenantContext();
  if (!ctx.isSystemMode) {
    throw new Error("Admin access required");
  }
  return ctx;
}

/**
 * Ensures the current user has tenant access and resolves the client.
 */
export async function requireTenant(): Promise<TenantContext> {
  const ctx = await resolveTenantContext();
  if (!ctx.isTenantMode || !ctx.clientId) {
    throw new Error("Tenant access required");
  }
  return ctx;
}

/**
 * Resolves the client record for the current user's Clerk org.
 * Returns null if no client is linked.
 */
export async function resolveClient(): Promise<{ userId: string; orgId: string; client: typeof clients.$inferSelect } | null> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return null;

  const client = await db.query.clients.findFirst({
    where: eq(clients.clerkOrgId, orgId),
  });

  if (!client) return null;

  return { userId, orgId, client };
}

/**
 * Provisions or updates a user in the database from Clerk session.
 */
export async function provisionUser(
  clerkUserId: string,
  clientId: string
): Promise<void> {
  const clerkUser = await currentUser();
  if (!clerkUser) return;

  const email = clerkUser.emailAddresses?.[0]?.emailAddress;
  const username = clerkUser.username || email?.split("@")[0] || "unknown";
  const fullName = [clerkUser.firstName, clerkUser.lastName]
    .filter(Boolean)
    .join(" ") || username;

  const existing = await db.query.userAccounts.findFirst({
    where: eq(userAccounts.clerkUserId, clerkUserId),
  });

  if (existing) {
    await db
      .update(userAccounts)
      .set({
        email,
        fullName,
        username,
        lastLogin: new Date(),
      })
      .where(eq(userAccounts.id, existing.id));
  } else {
    await db.insert(userAccounts).values({
      clerkUserId,
      username,
      email,
      fullName,
      clientId,
      status: "ACTIVE",
      lastLogin: new Date(),
    });
  }
}
