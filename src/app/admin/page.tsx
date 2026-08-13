import { db } from "@/db";
import { clients, devices, receipts, agents } from "@/db/schema";
import { count, sql, gte } from "drizzle-orm";
import { requireAdminPage } from "@/lib/tenant";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/cards/stat-card";
import { Users, Smartphone, Headphones, Receipt } from "lucide-react";
import { ReceiptsChart } from "@/components/charts/receipts-chart";
import { StatusChart } from "@/components/charts/status-chart";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { ReceiptsPerClientChart } from "@/components/charts/receipts-per-client-chart";
import { DeviceHealthChart } from "@/components/charts/device-health-chart";

async function getStats() {
  const [[clientsCount], [devicesCount], [receiptsCount], [agentsCount]] = await Promise.all([
    db.select({ value: count() }).from(clients),
    db.select({ value: count() }).from(devices),
    db.select({ value: count() }).from(receipts),
    db.select({ value: count() }).from(agents),
  ]);
  return {
    clients: clientsCount?.value || 0,
    devices: devicesCount?.value || 0,
    agents: agentsCount?.value || 0,
    receipts: receiptsCount?.value || 0,
  };
}

async function getDailyReceipts() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const rows = await db
    .select({
      date: sql<string>`TO_CHAR(${receipts.receivedAt}, 'MM-DD')`,
      count: count(),
    })
    .from(receipts)
    .where(gte(receipts.receivedAt, thirtyDaysAgo))
    .groupBy(sql`TO_CHAR(${receipts.receivedAt}, 'MM-DD')`)
    .orderBy(sql`MIN(${receipts.receivedAt})`);

  return rows.map((r) => ({ date: r.date, count: Number(r.count) }));
}

async function getStatusBreakdown() {
  const rows = await db
    .select({
      status: receipts.status,
      count: count(),
    })
    .from(receipts)
    .groupBy(receipts.status);

  return rows.map((r) => ({ status: r.status ?? "UNKNOWN", count: Number(r.count) }));
}

async function getRevenue() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const rows = await db.execute(sql`
    SELECT
      TO_CHAR(date_trunc('day', received_at), 'MM-DD') AS date,
      COALESCE(SUM((fiscal_payload_json::jsonb #>> '{receipt,receiptTotal}')::numeric), 0)::float AS revenue
    FROM fiscal_receipts
    WHERE received_at >= ${thirtyDaysAgo}
      AND fiscal_payload_json IS NOT NULL
    GROUP BY date_trunc('day', received_at)
    ORDER BY date_trunc('day', received_at)
  `);

  return rows.rows.map((r: any) => ({
    date: r.date as string,
    revenue: Number(r.revenue) || 0,
  }));
}

async function getReceiptsPerClient() {
  const rows = await db.execute(sql`
    SELECT
      c.name,
      COUNT(r.id)::int AS count
    FROM fiscal_receipts r
    JOIN clients c ON c.id = r.client_id
    GROUP BY c.name
    ORDER BY count DESC
    LIMIT 10
  `);

  return rows.rows.map((r: any) => ({
    name: r.name as string,
    count: Number(r.count),
  }));
}

async function getDeviceHealth() {
  const rows = await db.execute(sql`
    SELECT
      c.name AS client,
      SUM(CASE WHEN d.activated THEN 1 ELSE 0 END)::int AS activated,
      SUM(CASE WHEN NOT d.activated THEN 1 ELSE 0 END)::int AS pending
    FROM devices d
    JOIN clients c ON c.id = d.client_id
    GROUP BY c.name
  `);

  return rows.rows.map((r: any) => ({
    client: r.client as string,
    activated: Number(r.activated),
    pending: Number(r.pending),
  }));
}

export default async function AdminDashboardPage() {
  await requireAdminPage();
  const [stats, dailyReceipts, statusBreakdown, revenue, receiptsPerClient, deviceHealth] =
    await Promise.all([
      getStats(),
      getDailyReceipts(),
      getStatusBreakdown(),
      getRevenue(),
      getReceiptsPerClient(),
      getDeviceHealth(),
    ]);

  return (
    <div>
      <PageHeader title="Dashboard" description="Platform overview" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Clients" value={stats.clients} icon={Users} />
        <StatCard title="Devices" value={stats.devices} icon={Smartphone} />
        <StatCard title="Receipts" value={stats.receipts} icon={Receipt} />
        <StatCard title="Agents" value={stats.agents} icon={Headphones} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <ReceiptsChart data={dailyReceipts} />
        </div>
        <div className="lg:col-span-3">
          <StatusChart data={statusBreakdown} />
        </div>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <RevenueChart data={revenue} />
        </div>
        <div className="lg:col-span-3">
          <ReceiptsPerClientChart data={receiptsPerClient} />
        </div>
      </div>
      <div className="mt-6">
        <DeviceHealthChart data={deviceHealth} />
      </div>
    </div>
  );
}
