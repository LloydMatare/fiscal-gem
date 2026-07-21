import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/cards/stat-card";
import { Users, Smartphone, Headphones, Receipt, AlertTriangle } from "lucide-react";

async function getStats() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const [clientsRes, devicesRes, agentsRes, receiptsRes] = await Promise.all([
      fetch(`${base}/api/admin/clients?limit=1`, { cache: "no-store" }),
      fetch(`${base}/api/admin/clients?limit=1`, { cache: "no-store" }),
      fetch(`${base}/api/admin/clients?limit=1`, { cache: "no-store" }),
      fetch(`${base}/api/admin/clients?limit=1`, { cache: "no-store" }),
    ]);
    const clients = await clientsRes.json();
    return {
      clients: clients.pagination?.total || 0,
      devices: 0,
      agents: 0,
      receipts: 0,
    };
  } catch {
    return { clients: 0, devices: 0, agents: 0, receipts: 0 };
  }
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  return (
    <div>
      <PageHeader title="Dashboard" description="Platform overview" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Clients" value={stats.clients} icon={Users} />
        <StatCard title="Devices" value={stats.devices} icon={Smartphone} />
        <StatCard title="Agents" value={stats.agents} icon={Headphones} />
        <StatCard title="Receipts" value={stats.receipts} icon={Receipt} />
      </div>
    </div>
  );
}
