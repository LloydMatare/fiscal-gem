import { resolveClient } from "@/lib/tenant";
import { OrgNotConfigured } from "@/components/layout/org-not-configured";
import { PageHeader } from "@/components/layout/page-header";

export default async function SettingsPage() {
  const resolved = await resolveClient();
  if (!resolved) return <OrgNotConfigured />;
  const { client } = resolved;

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your organization settings"
      />
      <div className="rounded-md border p-6">
        <h2 className="text-lg font-semibold mb-4">Tax Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <InfoRow label="Tax ID" value={client.taxId} />
          <InfoRow label="Registration Number" value={client.registrationNumber} />
          <InfoRow label="Currency" value={client.currency} />
          <InfoRow label="Time Zone" value={client.timeZone} />
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
