import { resolveClient } from "@/lib/tenant";
import { OrgNotConfigured } from "@/components/layout/org-not-configured";
import { PageHeader } from "@/components/layout/page-header";

export default async function ProfilePage() {
  const resolved = await resolveClient();
  if (!resolved) return <OrgNotConfigured />;
  const { client } = resolved;

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
