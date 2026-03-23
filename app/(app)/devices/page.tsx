import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { devices, organizations, fiscalDays } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { Plus } from "lucide-react";
import { NoOrganization } from "@/components/auth/NoOrganization";
import { DataTable } from "@/components/ui/data-table";
import { deviceColumns } from "@/components/dashboard/device-columns";

export default async function DevicesPage() {
  const { orgId, sessionClaims } = await auth();
  const isAdmin = (sessionClaims as any)?.metadata?.role === "admin";

  if (!orgId) {
    return <NoOrganization isAdmin={isAdmin} />;
  }

  const org = (await db.select().from(organizations).where(eq(organizations.clerkOrgId, orgId))).at(0);
  if (!org) return <div>Organization sync required.</div>;

  const organizationDevices = await db.select().from(devices).where(eq(devices.organizationId, org.id));

  const devicesWithDay = await Promise.all(organizationDevices.map(async (device) => {
    const lastDay = (await db.select()
      .from(fiscalDays)
      .where(eq(fiscalDays.deviceId, device.id))
      .orderBy(desc(fiscalDays.openedAt))
    ).at(0);
    
    return {
      ...device,
      currentDayStatus: (lastDay?.status === 'open' ? 'open' : 'closed') as "open" | "closed",
      lastDayNo: lastDay?.fdmsDayNo || null,
    };
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#1e1a17]">Devices</h2>
          <p className="text-sm font-medium text-[#6a5f57]">
            Track device registration, certificates, and branch metadata.
          </p>
        </div>
        {isAdmin && (
          <Link 
            href="/devices/new"
            className="flex items-center gap-2 rounded-full bg-[#1e1a17] px-5 py-2.5 text-sm font-bold text-[#f6f2ea] hover:bg-black transition-all shadow-md active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Register device
          </Link>
        )}
      </div>

      <DataTable 
        columns={deviceColumns} 
        data={devicesWithDay} 
        searchKey="serialNumber" 
      />
    </div>
  );
}
