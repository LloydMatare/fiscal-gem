"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/devices", label: "Devices" },
  { href: "/receipts", label: "Receipts" },
  { href: "/files", label: "Files" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar() {
  const { user } = useUser();

  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-[#1e1a17]/10 bg-white/80 p-6 lg:flex">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1e1a17] text-[#f6f2ea] text-lg font-semibold">
          FG
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6a5f57]">
            FiscalGem
          </p>
          <p className="text-xs text-[#6a5f57]">Workspace</p>
        </div>
      </div>
      <nav className="mt-10 flex flex-col gap-2 text-sm">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl px-3 py-2 font-semibold text-[#463f3a] hover:bg-[#f6f2ea]"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto">
        <p className="text-sm font-semibold text-[#1e1a17]">
          {user?.firstName} {user?.lastName}
        </p>
        <p className="text-xs text-[#6a5f57]">{user?.primaryEmailAddress?.emailAddress}</p>
      </div>
    </aside>
  );
}
