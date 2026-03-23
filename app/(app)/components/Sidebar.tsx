"use client";

import Link from "next/link";
import { useUser, useOrganization } from "@clerk/nextjs";
import { 
  LayoutDashboard, 
  Smartphone, 
  Receipt, 
  Files, 
  Settings,
  ShieldCheck
} from "lucide-react";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/devices", label: "Devices", icon: Smartphone },
  { href: "/receipts", label: "Receipts", icon: Receipt },
  { href: "/files", label: "Files", icon: Files },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { user } = useUser();
  const { organization, membership } = useOrganization();
  const pathname = usePathname();
  
  // Global admin check (publicMetadata) or Org Admin check (current organization)
  const isGlobalAdmin = user?.publicMetadata?.role === "admin";
  const isOrgAdmin = membership?.role === "org:admin";
  const isAdmin = isGlobalAdmin || isOrgAdmin;

  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-[#1e1a17]/10 bg-white/80 p-6 lg:flex sticky top-0">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1e1a17] text-[#f6f2ea] text-lg font-semibold shadow-inner">
          FG
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#1e1a17]">
            FiscalGem
          </p>
          <p className="text-[10px] font-bold text-[#6a5f57] uppercase tracking-wider opacity-60 truncate max-w-[120px]">
            {organization?.name || "SaaS Gateway"}
          </p>
        </div>
      </div>
      
      <nav className="mt-10 flex flex-col gap-1.5 text-sm">
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-[#6a5f57] opacity-60">Main Menu</p>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold transition-all
                ${isActive 
                  ? "bg-[#fbbf24] text-[#1e1a17] shadow-sm" 
                  : "text-[#463f3a] hover:bg-[#1e1a17]/5"}`}
            >
              <item.icon size={18} className={isActive ? "text-[#1e1a17]" : "text-[#6a5f57]"} />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <p className="px-3 mt-6 mb-2 text-[10px] font-bold uppercase tracking-widest text-[#6a5f57] opacity-60">Administration</p>
            <Link
              href="/admin"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold transition-all
                ${pathname.startsWith("/admin") 
                  ? "bg-[#1e1a17] text-white shadow-sm" 
                  : "text-[#463f3a] hover:bg-[#1e1a17]/5"}`}
            >
              <ShieldCheck size={18} className={pathname.startsWith("/admin") ? "text-[#fbbf24]" : "text-[#6a5f57]"} />
              Admin Console
            </Link>
          </>
        )}
      </nav>

      <div className="mt-auto border-t border-[#1e1a17]/5 pt-6">
        <div className="flex items-center gap-3 rounded-2xl bg-[#1e1a17]/5 p-3">
          <div className="h-8 w-8 rounded-full bg-[#fbbf24] flex items-center justify-center text-xs font-bold text-[#1e1a17]">
            {user?.firstName?.[0] || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold text-[#1e1a17] truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[10px] text-[#6a5f57] truncate">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
