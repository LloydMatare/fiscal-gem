import { db } from "@/db";
import { clients, devices, receipts, agents } from "@/db/schema";
import { count } from "drizzle-orm";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/cards/stat-card";
import { Users, Smartphone, Headphones, Receipt } from "lucide-react";

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

export default async function AdminDashboardPage() {
  const stats = await getStats();

  return (
    <div>
      <PageHeader title="Dashboard" description="Platform overview" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Clients" value={stats.clients} icon={Users} />
        <StatCard title="Devices" value={stats.devices} icon={Smartphone} />
        <StatCard title="Receipts" value={stats.receipts} icon={Receipt} />
        <StatCard title="Agents" value={stats.agents} icon={Headphones} />
      </div>
    </div>
  );
}
