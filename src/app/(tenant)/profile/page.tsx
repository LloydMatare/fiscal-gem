import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/layout/page-header";

export default async function ProfilePage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect("/sign-in");

  const client = await db.query.clients.findFirst({
    where: eq(clients.clerkOrgId, orgId),
  });

  if (!client) redirect("/");

  return (
    <div>
      <PageHeader
        title="Business Profile"
        description="View and manage your business information"
      />
      <div className="rounded-md border p-6">
        <h2 className="text-lg font-semibold mb-4">Company Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <InfoRow label="Name" value={client.name} />
          <InfoRow label="Tenant Code" value={client.tenantCode} />
          <InfoRow label="Tax ID" value={client.taxId} />
          <InfoRow label="Registration Number" value={client.registrationNumber} />
          <InfoRow label="Line of Business" value={client.lineOfBusiness} />
          <InfoRow label="Industry Code" value={client.industryCode} />
          <InfoRow label="License Number" value={client.licenseNumber} />
          <InfoRow label="Currency" value={client.currency} />
          <InfoRow label="Time Zone" value={client.timeZone} />
          <InfoRow label="Notes" value={client.notes} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}
