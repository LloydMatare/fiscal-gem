"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export function Navbar({ signedIn }: { signedIn: boolean }) {
  const { orgRole } = useAuth();
  const dashboardHref = orgRole === "org:admin" ? "/admin" : "/dashboard";
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-fedge-gold/10 bg-background/60 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
        <a href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-fedge-mid to-fedge-dark flex items-center justify-center">
            <span className="text-sm font-bold text-fedge-cream">FG</span>
          </div>
          <span className="text-lg font-semibold">
            Fiscal<span className="text-fedge-mid">Gem</span>
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            How It Works
          </a>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Docs
          </a>
        </div>

        {signedIn ? (
          <Link
            href={dashboardHref}
            className="rounded-lg bg-fedge-dark px-4 py-2 text-sm font-medium text-fedge-cream transition-all hover:bg-fedge-mid"
          >
            Dashboard
          </Link>
        ) : (
          <Link
            href="/sign-in"
            className="rounded-lg bg-fedge-dark px-4 py-2 text-sm font-medium text-fedge-cream transition-all hover:bg-fedge-mid"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
