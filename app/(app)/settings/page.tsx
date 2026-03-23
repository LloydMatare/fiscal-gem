import { auth } from "@clerk/nextjs/server";
import { NoOrganization } from "@/components/auth/NoOrganization";
import { Settings as SettingsIcon, Save } from "lucide-react";
import { getAdminStatus } from "@/lib/auth/guards";

export default async function SettingsPage() {
  const { orgId } = await auth();
  const isAdmin = await getAdminStatus();

  if (!orgId) {
    return <NoOrganization isAdmin={isAdmin} />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h2 className="text-xl font-black text-[#1e1a17]">Settings</h2>
        <p className="text-sm font-medium text-[#6a5f57]">Manage your organization's fiscalization preferences.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-[2.5rem] border border-[#1e1a17]/10 bg-white/80 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <SettingsIcon className="text-[#fbbf24]" size={20} />
            <h3 className="text-lg font-black text-[#1e1a17]">General Configuration</h3>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#6a5f57] opacity-60">Default Currency</label>
              <select className="w-full rounded-2xl border border-[#1e1a17]/10 bg-[#f6f2ea]/40 px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#fbbf24] outline-none transition-all">
                <option>ZWL (Zimbabwe Dollar)</option>
                <option>USD (US Dollar)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#6a5f57] opacity-60">Operating Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <button className="rounded-2xl border-2 border-[#1e1a17] bg-[#1e1a17] p-4 text-left text-white transition-all">
                  <p className="text-xs font-black uppercase tracking-widest mb-1">Online</p>
                  <p className="text-[10px] opacity-60">Real-time submission</p>
                </button>
                <button className="rounded-2xl border border-[#1e1a17]/10 bg-white p-4 text-left transition-all hover:bg-[#f6f2ea]">
                  <p className="text-xs font-black uppercase tracking-widest text-[#1e1a17] mb-1">Offline</p>
                  <p className="text-[10px] text-[#6a5f57]">Batch file uploads</p>
                </button>
              </div>
            </div>

            <button className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#fbbf24] py-4 text-sm font-black text-[#1e1a17] shadow-lg shadow-[#fbbf24]/20 transition-all hover:scale-[1.02] active:scale-95">
              <Save size={18} />
              Save Changes
            </button>
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-[#1e1a17]/10 bg-[#1e1a17] p-8 text-white relative overflow-hidden group">
          <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-[#fbbf24]/10 blur-3xl" />
          <h3 className="text-lg font-black mb-4">Compliance Status</h3>
          <p className="text-sm text-white/60 mb-6">Your organization is fully registered with ZIMRA FDMS.</p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-xs font-bold">mTLS Certificate</span>
              <span className="text-[10px] font-black uppercase bg-green-500/20 text-green-400 px-2 py-1 rounded-full">Valid</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-xs font-bold">API Connectivity</span>
              <span className="text-[10px] font-black uppercase bg-green-500/20 text-green-400 px-2 py-1 rounded-full">Healthy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
