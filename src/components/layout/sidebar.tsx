"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Store,
  Smartphone,
  Receipt,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const adminNav = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Clients", href: "/admin/clients", icon: Users },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

const tenantNav = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Profile", href: "/profile", icon: Users },
  { label: "Shops", href: "/shops", icon: Store },
  { label: "Devices", href: "/devices", icon: Smartphone },
  { label: "Receipts", href: "/receipts", icon: Receipt },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ mode }: { mode: "admin" | "tenant" }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const nav = mode === "admin" ? adminNav : tenantNav;

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex items-center justify-between px-3 py-4">
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight">
            {mode === "admin" ? "Fiscal Gem Admin" : "Fiscal Gem"}
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1 hover:bg-muted"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-2">
        {nav.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
