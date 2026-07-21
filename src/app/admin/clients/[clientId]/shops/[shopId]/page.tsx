import { db } from "@/db";
import { clients, shops, agents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { AgentOnlineIndicator } from "@/components/status-badge";
import { ShopActions } from "@/components/admin/shop-actions";

export default async function ShopDetailPage({
  params,
}: {
  params: Promise<{ clientId: string; shopId: string }>;
}) {
  const { clientId, shopId } = await params;

  const [client, shop] = await Promise.all([
    db.query.clients.findFirst({ where: eq(clients.id, clientId) }),
    db.query.shops.findFirst({ where: and(eq(shops.id, shopId), eq(shops.clientId, clientId)) }),
  ]);

  if (!client || !shop) notFound();

  const shopAgents = await db.query.agents.findMany({
    where: and(eq(agents.shopId, shopId), eq(agents.deleted, false)),
  });

  return (
    <div>
      <PageHeader
        title={shop.name}
        breadcrumbs={[
          { label: "Clients", href: "/admin/clients" },
          { label: client.name, href: `/admin/clients/${clientId}` },
          { label: shop.name, href: "#" },
        ]}
      >
        <ShopActions shop={shop as any} />
      </PageHeader>

      <div className="rounded-md border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Shop Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <InfoRow label="Name" value={shop.name} />
          <InfoRow label="City" value={shop.city} />
          <InfoRow label="Address" value={shop.address} />
          <InfoRow label="Contact Person" value={shop.contactPerson} />
          <InfoRow label="Contact Phone" value={shop.contactPhone} />
        </div>
      </div>

      <div className="rounded-md border p-6">
        <h2 className="text-lg font-semibold mb-4">Agents ({shopAgents.length})</h2>
        {shopAgents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No agents registered</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Agent #</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Machine</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {shopAgents.map((agent) => (
                <tr key={agent.id} className="border-b">
                  <td className="px-4 py-3 text-sm font-medium">{agent.agentNumber}</td>
                  <td className="px-4 py-3 text-sm">{agent.machineId || "—"}</td>
                  <td className="px-4 py-3 text-sm">
                    <AgentOnlineIndicator online={agent.online} />
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {agent.lastSeen ? new Date(agent.lastSeen).toLocaleString() : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
