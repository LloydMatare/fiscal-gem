import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { devices, organizations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export function isAdminSession(sessionClaims: unknown) {
  const claims = sessionClaims as {
    metadata?: { role?: string };
    publicMetadata?: { role?: string };
    public_metadata?: { role?: string };
    org_role?: string;
    orgRole?: string;
  };

  const role =
    claims?.metadata?.role ??
    claims?.publicMetadata?.role ??
    claims?.public_metadata?.role;

  const orgRole = claims?.org_role ?? claims?.orgRole;

  return role === "admin" || orgRole === "org:admin";
}

export async function getAdminStatus() {
  const { sessionClaims, orgRole } = await auth();

  if (isAdminSession({ ...(sessionClaims as object), orgRole })) {
    return true;
  }

  const user = await currentUser();
  if (user?.publicMetadata?.role === "admin") {
    return true;
  }

  return false;
}

export async function requireAuth() {
  const { userId, orgId, sessionClaims } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return { userId, orgId, sessionClaims };
}

export async function requireAdmin() {
  const { userId, orgId, sessionClaims } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  if (!(await getAdminStatus())) {
    throw new Error("Forbidden");
  }
  return { userId, orgId, sessionClaims };
}

export async function requireOrganization() {
  const { userId, orgId, sessionClaims } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  if (!orgId) {
    throw new Error("Organization required");
  }

  const org = (
    await db
      .select()
      .from(organizations)
      .where(eq(organizations.clerkOrgId, orgId))
  ).at(0);

  if (!org) {
    throw new Error("Organization not found");
  }

  return { userId, orgId, sessionClaims, org };
}

export async function requireOrganizationAdmin() {
  const { userId, orgId, sessionClaims } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  if (!(await getAdminStatus())) {
    throw new Error("Forbidden");
  }
  if (!orgId) {
    throw new Error("Organization required");
  }

  const org = (
    await db
      .select()
      .from(organizations)
      .where(eq(organizations.clerkOrgId, orgId))
  ).at(0);

  if (!org) {
    throw new Error("Organization not found");
  }

  return { userId, orgId, sessionClaims, org };
}

export async function requireDeviceForOrg(deviceId: string) {
  const { userId, orgId, sessionClaims, org } = await requireOrganization();
  const device = (
    await db
      .select()
      .from(devices)
      .where(and(eq(devices.id, deviceId), eq(devices.organizationId, org.id)))
  ).at(0);

  if (!device) {
    throw new Error("Device not found or unauthorized");
  }

  return { userId, orgId, sessionClaims, org, device };
}
