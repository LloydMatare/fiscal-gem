import { auth } from "@clerk/nextjs/server";
import { NoOrganization } from "@/components/auth/NoOrganization";
import { DataTable } from "@/components/ui/data-table";
import { fileColumns } from "@/components/dashboard/file-columns";
import { db } from "@/lib/db";
import { devices, files, organizations } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { UploadFileDialog } from "./UploadFileDialog";

export default async function FilesPage() {
  const { orgId, sessionClaims } = await auth();
  const isAdmin = (sessionClaims as any)?.metadata?.role === "admin";

  if (!orgId) {
    return <NoOrganization isAdmin={isAdmin} />;
  }

  const org = (
    await db
      .select()
      .from(organizations)
      .where(eq(organizations.clerkOrgId, orgId))
  ).at(0);
  if (!org) return <div>Organization sync required.</div>;

  const organizationDevices = await db
    .select({
      id: devices.id,
      deviceId: devices.deviceId,
      serialNumber: devices.serialNumber,
    })
    .from(devices)
    .where(eq(devices.organizationId, org.id));

  const organizationFiles = await db
    .select({
      id: files.id,
      fileName: files.fileName,
      type: files.type,
      status: files.status,
      createdAt: files.createdAt,
    })
    .from(files)
    .innerJoin(devices, eq(files.deviceId, devices.id))
    .where(eq(devices.organizationId, org.id))
    .orderBy(desc(files.createdAt));

  const fileRows = organizationFiles.map((file) => ({
    name: file.fileName ?? "Untitled file",
    type: file.type,
    status: file.status,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#1e1a17]">Files</h2>
          <p className="text-sm font-medium text-[#6a5f57]">
            Submit batch files and track processing status with FDMS.
          </p>
        </div>
        <UploadFileDialog devices={organizationDevices} />
      </div>

      <DataTable 
        columns={fileColumns} 
        data={fileRows} 
        searchKey="name" 
      />
    </div>
  );
}
