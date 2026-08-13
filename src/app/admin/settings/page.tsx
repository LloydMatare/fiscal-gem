import { db } from "@/db";
import { clients } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import { requireAdminPage } from "@/lib/tenant";
import { PageHeader } from "@/components/layout/page-header";

export default async function AdminSettingsPage() {
  await requireAdminPage();
  const [{ total: totalClients }] = await db
    .select({ total: count() })
    .from(clients);

  const [{ total: activeClients }] = await db
    .select({ total: count() })
    .from(clients)
    .where(eq(clients.status, "ACTIVE"));

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Platform configuration and system information"
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-md border p-6">
          <h2 className="text-lg font-semibold mb-4">System Overview</h2>
          <div className="space-y-3">
            <InfoRow label="Total Clients" value={totalClients.toString()} />
            <InfoRow label="Active Clients" value={activeClients.toString()} />
            <InfoRow label="FDMS Endpoint" value={process.env.ZIMRA_FDMS_BASE_URL || "Not configured"} />
            <InfoRow label="Environment" value={process.env.NODE_ENV || "development"} />
          </div>
        </div>

        <div className="rounded-md border p-6">
          <h2 className="text-lg font-semibold mb-4">API Configuration</h2>
          <div className="space-y-3">
            <InfoRow label="API Version" value="v1" />
            <InfoRow label="Webhook URL" value="/api/webhook/clerk" />
            <InfoRow label="S2S Auth" value="SHA-256 API Key" />
            <InfoRow label="mTLS" value="EC P-256 Certificates" />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}
