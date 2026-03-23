"use client";

import { OrganizationSwitcher } from "@clerk/nextjs";
import { Activity, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface NoOrganizationProps {
  isAdmin?: boolean;
}

export function NoOrganization({ isAdmin }: NoOrganizationProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 rounded-[2.5rem] bg-[#1e1a17] p-8 text-white shadow-2xl relative overflow-hidden group max-w-md">
        <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-[#fbbf24]/20 blur-2xl" />
        <Activity className="mx-auto h-12 w-12 text-[#fbbf24] mb-4" />
        <h2 className="text-2xl font-black mb-2">Organization Required</h2>
        <p className="text-sm text-white/60 mb-8">
          To access this area, please select an active organization or create a new one using the switcher below.
        </p>
        
        <div className="space-y-3">
          {isAdmin ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#fbbf24]">Action Required</p>
              <div className="bg-white/10 rounded-2xl p-4 w-full border border-white/5">
                <OrganizationSwitcher 
                  afterCreateOrganizationUrl="/dashboard"
                  afterSelectOrganizationUrl="/dashboard"
                  appearance={{
                    elements: {
                      rootBox: "flex items-center justify-center w-full",
                      organizationSwitcherTrigger: "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-white/10",
                    }
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
              Contact your administrator to be assigned to an organization.
            </div>
          )}

          {isAdmin && (
            <Link 
              href="/admin"
              className="flex items-center justify-center gap-2 w-full rounded-2xl bg-[#fbbf24] py-3.5 text-sm font-black text-[#1e1a17] transition-all hover:bg-[#f59e0b]"
            >
              <ShieldCheck size={16} />
              Open Admin Console
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>
      <p className="text-xs text-[#6a5f57] font-medium opacity-60">
        Multi-tenant isolation is enforced for all ZIMRA operations.
      </p>
    </div>
  );
}
