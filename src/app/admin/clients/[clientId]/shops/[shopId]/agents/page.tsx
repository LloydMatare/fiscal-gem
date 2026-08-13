import { db } from "@/db";
import { clients, shops, agents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/tenant";
import { PageHeader } from "@/components/layout/page-header";
import { AgentOnlineIndicator } from "@/components/status-badge";

export default async function AdminAgentsPage({
  params,
}: {
  params: Promise<{ clientId: string; shopId: string }>;
}) {
  await requireAdminPage();
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
        title="Agents"
        description={`Agents for ${shop.name}`}
        breadcrumbs={[
          { label: "Clients", href: "/admin/clients" },
          { label: client.name, href: `/admin/clients/${clientId}` },
          { label: shop.name, href: `/admin/clients/${clientId}/shops/${shopId}` },
          { label: "Agents", href: "#" },
        ]}
      />

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Agent #</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Machine ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">FDMS Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {shopAgents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No agents found
                </td>
              </tr>
            ) : (
              shopAgents.map((agent) => (
                <tr key={agent.id} className="border-b">
                  <td className="px-4 py-3 text-sm font-medium">{agent.agentNumber}</td>
                  <td className="px-4 py-3 text-sm">{agent.machineId || "—"}</td>
                  <td className="px-4 py-3 text-sm">{agent.type || "—"}</td>
                  <td className="px-4 py-3 text-sm">
                    <AgentOnlineIndicator online={agent.online} />
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {agent.lastSeen ? new Date(agent.lastSeen).toLocaleString() : "Never"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
