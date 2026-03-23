"use server";

import { auth } from "@clerk/nextjs/server";
import { registerDevice, getDeviceConfig, openFiscalDay, closeFiscalDay } from "@/lib/fdms/services";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { isAdminSession, requireDeviceForOrg } from "@/lib/auth/guards";

/**
 * Ensures an organization exists in our DB based on Clerk's orgId.
 */
export async function getOrCreateOrganization(clerkOrgId: string, name: string) {
  let org = (await db.select().from(organizations).where(eq(organizations.clerkOrgId, clerkOrgId))).at(0);
  
  if (!org) {
    [org] = await db.insert(organizations).values({
      clerkOrgId,
      name,
    }).returning();
  }
  
  return org;
}

/**
 * Public action to trigger organization sync.
 */
export async function ensureOrganizationAction() {
  const { orgId, orgSlug } = await auth();
  if (!orgId) return null;
  
  const org = await getOrCreateOrganization(orgId, orgSlug || "Unnamed Organization");
  return org;
}

export async function registerDeviceAction(formData: {
  deviceId: string;
  serialNumber: string;
  activationKey: string;
}) {
  const { orgId, orgSlug, sessionClaims } = await auth();

  if (!isAdminSession(sessionClaims)) {
    throw new Error("Forbidden");
  }
  
  if (!orgId) {
    throw new Error("You must be in an organization to register a device.");
  }

  const org = await getOrCreateOrganization(orgId, orgSlug || "Unnamed Organization");

  try {
    const device = await registerDevice(org.id, {
      deviceId: parseInt(formData.deviceId),
      serialNumber: formData.serialNumber,
      activationKey: formData.activationKey,
    });

    await getDeviceConfig(device.id);

    revalidatePath("/devices");
    return { success: true, deviceId: device.id };
  } catch (error: any) {
    console.error("Registration error:", error);
    return { success: false, error: error.message };
  }
}

export async function openDayAction(deviceId: string) {
  try {
    await requireDeviceForOrg(deviceId);
    await openFiscalDay(deviceId);
    revalidatePath("/devices");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function closeDayAction(deviceId: string) {
  try {
    await requireDeviceForOrg(deviceId);
    await closeFiscalDay(deviceId);
    revalidatePath("/devices");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
