import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { devices, organizations, fiscalDays } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import NewReceiptForm from "./NewReceiptForm";

export default async function NewReceiptPage() {
  const { orgId } = await auth();

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-semibold">No Organization</h2>
        <p className="text-sm text-[#6a5f57]">Select an organization to create receipts.</p>
      </div>
    );
  }

  const org = (await db.select().from(organizations).where(eq(organizations.clerkOrgId, orgId))).at(0);
  
  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-semibold">Organization Not Found</h2>
        <p className="text-sm text-[#6a5f57]">Please complete your organization profile first.</p>
      </div>
    );
  }

  // Fetch all devices for this org
  const organizationDevices = await db.select().from(devices).where(eq(devices.organizationId, org.id));

  // Check fiscal day status for each
  const devicesWithStatus = await Promise.all(organizationDevices.map(async (device) => {
    const lastDay = (await db.select()
      .from(fiscalDays)
      .where(eq(fiscalDays.deviceId, device.id))
      .orderBy(desc(fiscalDays.openedAt))
    ).at(0);
    
    return {
      id: device.id,
      serialNumber: device.serialNumber,
      currentDayStatus: lastDay?.status === 'open' ? 'open' : 'closed',
    };
  }));

  return <NewReceiptForm devices={devicesWithStatus} />;
}
