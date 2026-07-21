import { db } from "@/db";
import { clients, shops, devices, receipts } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/cards/stat-card";
import { Store, Smartphone, Receipt } from "lucide-react";
import Link from "next/link";
import { ClientActions } from "@/components/admin/client-actions";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
  });

  if (!client) notFound();

  const [[shopCount], [deviceCount], [receiptCount]] = await Promise.all([
    db.select({ total: count() }).from(shops).where(eq(shops.clientId, clientId)),
    db.select({ total: count() }).from(devices).where(eq(devices.clientId, clientId)),
    db.select({ total: count() }).from(receipts).where(eq(receipts.clientId, clientId)),
  ]);

  return (
    <div>
      <PageHeader
        title={client.name}
        description={`Tenant Code: ${client.tenantCode}`}
        breadcrumbs={[
          { label: "Clients", href: "/admin/clients" },
          { label: client.name, href: `/admin/clients/${clientId}` },
        ]}
      >
        <div className="flex items-center gap-2">
          <StatusBadge status={client.status} />
          <ClientActions client={client as any} />
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Link href={`/admin/clients/${clientId}/shops`}>
          <StatCard title="Shops" value={shopCount.total} icon={Store} className="hover:border-primary/50 transition-colors" />
        </Link>
        <Link href={`/admin/clients/${clientId}/devices`}>
          <StatCard title="Devices" value={deviceCount.total} icon={Smartphone} className="hover:border-primary/50 transition-colors" />
        </Link>
        <Link href={`/admin/clients/${clientId}/receipts`}>
          <StatCard title="Receipts" value={receiptCount.total} icon={Receipt} className="hover:border-primary/50 transition-colors" />
        </Link>
      </div>

      <div className="rounded-md border p-6">
        <h2 className="text-lg font-semibold mb-4">Client Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <InfoRow label="Name" value={client.name} />
          <InfoRow label="Tenant Code" value={client.tenantCode} />
          <InfoRow label="Tax ID" value={client.taxId} />
          <InfoRow label="Registration Number" value={client.registrationNumber} />
          <InfoRow label="Currency" value={client.currency} />
          <InfoRow label="Time Zone" value={client.timeZone} />
          <InfoRow label="Line of Business" value={client.lineOfBusiness} />
          <InfoRow label="ZIMRA Device ID" value={client.zimraDeviceId?.toString()} />
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
