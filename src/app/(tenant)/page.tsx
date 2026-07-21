import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { clients, shops, devices, receipts, agents } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/cards/stat-card";
import { Store, Smartphone, Headphones, Receipt } from "lucide-react";

export default async function TenantDashboardPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect("/sign-in");

  const client = await db.query.clients.findFirst({
    where: eq(clients.clerkOrgId, orgId),
  });

  if (!client) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <p className="text-muted-foreground">No organization found. Please contact support.</p>
      </div>
    );
  }

  const [[shopCount], [deviceCount], [agentCount], [receiptCount]] = await Promise.all([
    db.select({ total: count() }).from(shops).where(eq(shops.clientId, client.id)),
    db.select({ total: count() }).from(devices).where(eq(devices.clientId, client.id)),
    db.select({ total: count() }).from(agents).innerJoin(shops, eq(agents.shopId, shops.id)).where(eq(shops.clientId, client.id)),
    db.select({ total: count() }).from(receipts).where(eq(receipts.clientId, client.id)),
  ]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Welcome to ${client.name}`}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Shops" value={shopCount.total} icon={Store} />
        <StatCard title="Devices" value={deviceCount.total} icon={Smartphone} />
        <StatCard title="Agents" value={agentCount.total} icon={Headphones} />
        <StatCard title="Receipts" value={receiptCount.total} icon={Receipt} />
      </div>
    </div>
  );
}
