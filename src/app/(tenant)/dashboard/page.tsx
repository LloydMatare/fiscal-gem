import { resolveClient } from "@/lib/tenant";
import { OrgNotConfigured } from "@/components/layout/org-not-configured";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { shops, devices, agents, receipts } from "@/db/schema";
import { eq, count, sql, and, gte, desc } from "drizzle-orm";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/cards/stat-card";
import { Store, Smartphone, Headphones, Receipt, CheckCircle } from "lucide-react";
import { ReceiptsChart } from "@/components/charts/receipts-chart";
import { StatusChart } from "@/components/charts/status-chart";

export default async function TenantDashboardPage() {
  const resolved = await resolveClient();
  if (!resolved) return <OrgNotConfigured />;
  const { client } = resolved;

  const [[shopCount], [deviceCount], [agentCount], [totalReceipts], [fiscalisedCount]] =
    await Promise.all([
      db.select({ value: count() }).from(shops).where(eq(shops.clientId, client.id)),
      db.select({ value: count() }).from(devices).where(eq(devices.clientId, client.id)),
      db
        .select({ value: count() })
        .from(agents)
        .innerJoin(shops, eq(agents.shopId, shops.id))
        .where(eq(shops.clientId, client.id)),
      db.select({ value: count() }).from(receipts).where(eq(receipts.clientId, client.id)),
      db
        .select({ value: count() })
        .from(receipts)
        .where(and(eq(receipts.clientId, client.id), eq(receipts.status, "FISCALISED"))),
    ]);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyReceipts = await db
    .select({
      date: sql<string>`TO_CHAR(${receipts.receivedAt}, 'MM-DD')`,
      count: count(),
    })
    .from(receipts)
    .where(and(eq(receipts.clientId, client.id), gte(receipts.receivedAt, thirtyDaysAgo)))
    .groupBy(sql`TO_CHAR(${receipts.receivedAt}, 'MM-DD')`)
    .orderBy(sql`MIN(${receipts.receivedAt})`);

  const statusBreakdown = await db
    .select({
      status: receipts.status,
      count: count(),
    })
    .from(receipts)
    .where(eq(receipts.clientId, client.id))
    .groupBy(receipts.status);

  return (
    <div>
      <PageHeader title="Dashboard" description={`Welcome to ${client.name}`} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Shops" value={shopCount.value} icon={Store} />
        <StatCard title="Devices" value={deviceCount.value} icon={Smartphone} />
        <StatCard title="Agents" value={agentCount.value} icon={Headphones} />
        <StatCard title="Total Receipts" value={totalReceipts.value} icon={Receipt} />
        <StatCard title="Fiscalised" value={fiscalisedCount.value} icon={CheckCircle} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <ReceiptsChart data={dailyReceipts} />
        </div>
        <div className="lg:col-span-3">
          <StatusChart data={statusBreakdown} />
        </div>
      </div>
    </div>
  );
}
