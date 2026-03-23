import { auth } from "@clerk/nextjs/server";
import { NoOrganization } from "@/components/auth/NoOrganization";
import { DataTable } from "@/components/ui/data-table";
import { fileColumns } from "@/components/dashboard/file-columns";

export default async function FilesPage() {
  const { orgId, sessionClaims } = await auth();
  const isAdmin = (sessionClaims as any)?.metadata?.role === "admin";

  if (!orgId) {
    return <NoOrganization isAdmin={isAdmin} />;
  }

  // Placeholder for real files fetch - normally these would come from DB
  const files: any[] = [
    { name: "fiscal-day-2026-03-15.json", type: "FiscalDayCounters", status: "Completed" },
    { name: "offline-receipts-2026-03-14.json", type: "OfflineReceipts", status: "Completed" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#1e1a17]">Files</h2>
          <p className="text-sm font-medium text-[#6a5f57]">
            Submit batch files and track processing status with FDMS.
          </p>
        </div>
        <button className="rounded-full bg-[#1e1a17] px-6 py-2.5 text-sm font-bold text-[#f6f2ea] hover:bg-black transition-all shadow-md active:scale-95">
          Upload file
        </button>
      </div>

      <DataTable 
        columns={fileColumns} 
        data={files} 
        searchKey="name" 
      />
    </div>
  );
}
