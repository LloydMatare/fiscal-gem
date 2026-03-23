import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { organizations, devices, receipts } from "@/lib/db/schema";
import { count, sum, desc, eq } from "drizzle-orm";
import { 
  Users, 
  Smartphone, 
  Receipt as ReceiptIcon, 
  TrendingUp,
  Activity,
  Globe,
  ShieldCheck
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { activityColumns } from "@/components/admin/activity-columns";
import { getAdminStatus } from "@/lib/auth/guards";

export default async function AdminDashboardPage() {
  const { userId } = await auth();
  
  // Basic admin check
  const isAdmin = await getAdminStatus();
  
  if (!isAdmin) {
    redirect("/dashboard");
  }

  // 1. Fetch Global Stats
  const orgCount = await db.select({ count: count() }).from(organizations);
  const deviceCount = await db.select({ count: count() }).from(devices);
  const totalReceipts = await db.select({ count: count() }).from(receipts);
  const totalRevenue = await db.select({ total: sum(receipts.total) }).from(receipts);

  // 2. Fetch Recent Transactions Across All Tenants
  const recentActivity = await db.select({
      id: receipts.id,
      receiptNo: receipts.receiptNo,
      organization: organizations.name,
      total: receipts.total,
      status: receipts.status,
      createdAt: receipts.createdAt,
    })
    .from(receipts)
    .innerJoin(devices, eq(receipts.deviceId, devices.id))
    .innerJoin(organizations, eq(devices.organizationId, organizations.id))
    .orderBy(desc(receipts.createdAt))
    .limit(20);

  const stats = [
    { label: "Total Organizations", value: orgCount[0].count, icon: Users, color: "text-blue-600" },
    { label: "Active Devices", value: deviceCount[0].count, icon: Smartphone, color: "text-green-600" },
    { label: "Total Receipts", value: totalReceipts[0].count, icon: ReceiptIcon, color: "text-amber-600" },
    { label: "Global Revenue", value: `$${((Number(totalRevenue[0].total || 0)) / 100).toLocaleString()}`, icon: TrendingUp, color: "text-teal-600" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header section with glassmorphism */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[#1e1a17] p-8 text-white shadow-2xl group">
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[#fbbf24]/10 blur-3xl transition-transform group-hover:scale-110" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div>
             <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="text-[#fbbf24]" size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#fbbf24]">System Administrator</span>
             </div>
             <h2 className="text-3xl font-black">Platform Oversight</h2>
             <p className="mt-2 text-sm text-white/50 max-w-md">
                Monitor global ZIMRA fiscalization volume, device health, and tenant onboarding across the entire SaaS environment.
             </p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                <Globe className="text-green-400" size={16} />
                <span className="text-xs font-bold">FDMS Gateway: <span className="text-green-400">Stable</span></span>
             </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <section className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group rounded-3xl border border-[#1e1a17]/10 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition-all hover:shadow-md"
          >
            <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e1a17]/5 ${stat.color}`}>
              <stat.icon size={18} />
            </div>
            <p className="text-[10px] uppercase font-black tracking-widest text-[#6a5f57] opacity-60 leading-tight">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-black text-[#1e1a17]">{stat.value}</p>
          </div>
        ))}
      </section>

      {/* Recent Activity Table */}
      <div className="space-y-4">
         <div className="flex items-center gap-2 px-2">
            <Activity className="text-[#fbbf24]" size={18} />
            <h3 className="text-lg font-black text-[#1e1a17]">Global Activity Stream</h3>
         </div>
         
         <DataTable 
            columns={activityColumns} 
            data={recentActivity} 
            searchKey="receiptNo"
         />
      </div>
    </div>
  );
}
