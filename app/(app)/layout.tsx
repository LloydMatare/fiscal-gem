import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sidebar } from "./components/Sidebar";
import {Bell, MessageCircle, Search} from "lucide-react";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { ensureOrganizationAction } from "@/lib/actions/devices";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId, sessionClaims } = await auth();
  const isAdmin = (sessionClaims as any)?.metadata?.role === "admin";

  if (!userId) {
    redirect("/sign-in");
  }

  // Silently ensure the organization exists in our DB if one is selected
  if (orgId) {
    await ensureOrganizationAction();
  }

  return (
    <div className="min-h-screen bg-[#f6f2ea] text-[#1e1a17]">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-[#1e1a17]/10 bg-white/80 px-6 py-4 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[10px] uppercase font-black tracking-[0.2em] text-[#6a5f57] opacity-60">
                  Fiscal Device Gateway
                </p>
                <h1 className="text-lg font-black text-[#1e1a17]">Operations Console</h1>
              </div>
              <div className="h-8 w-px bg-[#1e1a17]/10 hidden sm:block" />
              {isAdmin && (
                <OrganizationSwitcher 
                  afterCreateOrganizationUrl="/dashboard"
                  afterSelectOrganizationUrl="/dashboard"
                  appearance={{
                    elements: {
                      rootBox: "flex items-center",
                      organizationSwitcherTrigger: "rounded-xl border border-[#1e1a17]/10 bg-[#f6f2ea]/50 px-3 py-1.5 text-xs font-bold transition-all hover:bg-[#f6f2ea] focus:shadow-none focus:ring-0",
                    }
                  }}
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 mr-4 border-r border-[#1e1a17]/10 pr-4">
                <button className="rounded-xl p-2.5 text-[#6a5f57] hover:bg-[#f6f2ea] hover:text-[#1e1a17] transition-all">
                  <Search size={18} />
                </button>
                <button className="rounded-xl p-2.5 text-[#6a5f57] hover:bg-[#f6f2ea] hover:text-[#1e1a17] transition-all relative">
                  <MessageCircle size={18} />
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#fbbf24] border-2 border-white" />
                </button>
                <button className="rounded-xl p-2.5 text-[#6a5f57] hover:bg-[#f6f2ea] hover:text-[#1e1a17] transition-all">
                  <Bell size={18} />
                </button>
              </div>
              <UserButton 
                appearance={{
                  elements: {
                    userButtonAvatarBox: "h-9 w-9 rounded-xl border-2 border-white shadow-sm"
                  }
                }}
              />
            </div>
          </header>
          <main className="flex-1 px-6 py-8 animate-in fade-in duration-500">{children}</main>
        </div>
      </div>
    </div>
  );
}
