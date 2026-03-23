import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { receipts, devices, organizations } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { Plus } from "lucide-react";
import { NoOrganization } from "@/components/auth/NoOrganization";
import { DataTable } from "@/components/ui/data-table";
import { receiptColumns } from "@/components/dashboard/receipt-columns";

export default async function ReceiptsPage() {
  const { orgId, sessionClaims } = await auth();
  const isAdmin = (sessionClaims as any)?.metadata?.role === "admin";

  if (!orgId) {
    return <NoOrganization isAdmin={isAdmin} />;
  }

  const org = (await db.select().from(organizations).where(eq(organizations.clerkOrgId, orgId))).at(0);
  if (!org) return <div>Organization sync required.</div>;

  const organizationReceipts = await db.select({
        id: receipts.id,
        receiptNo: receipts.receiptNo,
        currency: receipts.currency,
        total: receipts.total,
        status: receipts.status,
        submittedAt: receipts.submittedAt,
        createdAt: receipts.createdAt,
        deviceSerial: devices.serialNumber,
        qrUrl: receipts.fdmsReceiptUrl,
      })
      .from(receipts)
      .innerJoin(devices, eq(receipts.deviceId, devices.id))
      .where(eq(devices.organizationId, org.id))
      .orderBy(desc(receipts.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#1e1a17]">Receipts</h2>
          <p className="text-sm font-medium text-[#6a5f57]">
            Monitor receipt submissions, QR URLs, and response codes.
          </p>
        </div>
        <Link 
          href="/receipts/new"
          className="flex items-center gap-2 rounded-full bg-[#1e1a17] px-5 py-2.5 text-sm font-bold text-[#f6f2ea] hover:bg-black transition-all shadow-md active:scale-95"
        >
          <Plus className="h-4 w-4" />
          New Receipt
        </Link>
      </div>

      <DataTable 
        columns={receiptColumns} 
        data={organizationReceipts} 
        searchKey="receiptNo" 
      />
    </div>
  );
}
