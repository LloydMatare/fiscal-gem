"use client";

import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";

export function Header({ mode }: { mode: "admin" | "tenant" }) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        {mode === "tenant" && <OrganizationSwitcher />}
      </div>
      <div className="flex items-center gap-3">
        <UserButton />
      </div>
    </header>
  );
}
