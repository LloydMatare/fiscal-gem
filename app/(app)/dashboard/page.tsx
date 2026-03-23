import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { devices, organizations, fiscalDays, receipts } from "@/lib/db/schema";
import { eq, and, sql, desc, sum } from "drizzle-orm";
import { 
  Smartphone, 
  Receipt, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Activity
} from "lucide-react";
import Link from "next/link";
import { NoOrganization } from "@/components/auth/NoOrganization";

export default async function DashboardPage() {
  const { orgId, sessionClaims } = await auth();
  const isAdmin = (sessionClaims as any)?.metadata?.role === "admin";

  if (!orgId) {
    return <NoOrganization isAdmin={isAdmin} />;
  }

  const org = (await db.select().from(organizations).where(eq(organizations.clerkOrgId, orgId))).at(0);
  
  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
        <div className="rounded-[2.5rem] bg-white border border-[#1e1a17]/10 p-10 max-w-sm shadow-sm">
           <AlertCircle className="mx-auto h-10 w-10 text-amber-500 mb-4" />
           <h2 className="text-xl font-bold mb-2">Syncing Organization...</h2>
           <p className="text-sm text-[#6a5f57] mb-6">We're setting up your workspace in our records. This happens automatically when you first visit.</p>
           <div className="h-1 w-full bg-[#f6f2ea] rounded-full overflow-hidden">
              <div className="h-full bg-[#fbbf24] w-1/2 animate-progress" />
           </div>
        </div>
      </div>
    );
  }

  const tenantDevices = await db.select().from(devices).where(eq(devices.organizationId, org.id));
  const activeDeviceCount = tenantDevices.filter(d => d.status === 'active').length;
  
  const openDays = await db.select({ count: sql<number>`count(*)` })
    .from(fiscalDays)
    .innerJoin(devices, eq(fiscalDays.deviceId, devices.id))
    .where(and(eq(devices.organizationId, org.id), eq(fiscalDays.status, 'open')));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const salesToday = await db.select({ total: sum(receipts.total) })
    .from(receipts)
    .innerJoin(devices, eq(receipts.deviceId, devices.id))
    .where(and(
      eq(devices.organizationId, org.id),
      sql`${receipts.createdAt} >= ${today.toISOString()}`
    ));

  const stats = [
    { label: "Active devices", value: activeDeviceCount, icon: Smartphone, color: "text-blue-600" },
    { label: "Open fiscal days", value: Number(openDays[0].count), icon: Activity, color: "text-green-600" },
    { label: "Sales today", value: `ZWL ${((Number(salesToday[0].total || 0)) / 100).toLocaleString()}`, icon: TrendingUp, color: "text-amber-600" },
    { label: "Compliance Score", value: "98%", icon: AlertCircle, color: "text-teal-600" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <section className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group rounded-3xl border border-[#1e1a17]/10 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition-all hover:shadow-md"
          >
            <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e1a17]/5 ${stat.color}`}>
              <stat.icon size={18} />
            </div>
            <p className="text-[10px] uppercase font-black tracking-widest text-[#6a5f57] opacity-60">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-black text-[#1e1a17]">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-[2.5rem] border border-[#1e1a17]/10 bg-white/80 p-8 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black flex items-center gap-2 text-[#1e1a17]">
              <Smartphone className="text-[#fbbf24]" />
              Device Status
            </h2>
            <Link href="/devices" className="text-xs font-bold text-[#d97706] hover:underline">Manage All</Link>
          </div>
          
          <div className="space-y-4 flex-1">
            {tenantDevices.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-12 text-[#6a5f57] border-2 border-dashed border-[#1e1a17]/5 rounded-[2rem]">
                  <p className="text-sm font-medium">No devices registered</p>
               </div>
            ) : (
              tenantDevices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between rounded-[1.5rem] border border-[#1e1a17]/5 bg-[#f6f2ea]/40 p-5 transition-all hover:bg-[#f6f2ea]/60"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-2 w-2 rounded-full ${device.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-300'}`} />
                    <div>
                      <p className="text-sm font-extrabold text-[#1e1a17]">{device.serialNumber}</p>
                      <p className="text-[10px] font-bold text-[#6a5f57] uppercase tracking-tighter opacity-70">
                        {device.branchName} • {device.mode} Mode
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-tighter
                      ${device.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                    >
                      {device.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-[#1e1a17]/10 bg-[#1e1a17] p-8 text-[#f6f2ea] shadow-2xl relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[#fbbf24]/10 blur-3xl transition-transform group-hover:scale-110" />
          
          <h2 className="text-xl font-black mb-6 flex items-center gap-2">
            <Clock className="text-[#fbbf24] h-5 w-5" />
            Next Actions
          </h2>
          
          <div className="space-y-4 relative z-10">
            {activeDeviceCount === 0 && (
               <Link href="/devices/new" className="block group/item">
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 transition-all hover:bg-white/10">
                    <p className="text-sm font-bold text-white">Register first device</p>
                    <p className="mt-1 text-xs text-[#f6f2ea]/50">Start your ZIMRA integration flow</p>
                    <div className="mt-3 text-[10px] font-black text-[#fbbf24] uppercase tracking-widest">Action Required</div>
                  </div>
               </Link>
            )}
            
            {activeDeviceCount > 0 && Number(openDays[0].count) === 0 && (
               <Link href="/devices" className="block group/item">
                  <div className="rounded-[1.5rem] border border-[#fbbf24]/30 bg-[#fbbf24]/5 p-5 transition-all hover:bg-[#fbbf24]/10">
                    <p className="text-sm font-bold text-[#fbbf24]">Open Fiscal Day</p>
                    <p className="mt-1 text-xs text-[#f6f2ea]/50">Unlock transaction capability</p>
                    <div className="mt-3 text-[10px] font-black text-[#fbbf24] uppercase tracking-widest">Essential</div>
                  </div>
               </Link>
            )}

            <Link href="/receipts/new" className="block group/item">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 transition-all hover:bg-white/10">
                <p className="text-sm font-bold text-white">Record Sale</p>
                <p className="mt-1 text-xs text-[#f6f2ea]/50">Quick invoice generation</p>
                <div className="mt-3 text-[10px] font-black text-[#6a5f57] uppercase tracking-widest group-hover/item:text-white/60">Routine</div>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
