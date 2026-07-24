"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useAuth } from "@clerk/nextjs";

gsap.registerPlugin(ScrollTrigger);

const benefits = [
  "No credit card required",
  "Setup in under 5 minutes",
  "Full API documentation",
  "Sandbox environment included",
];

export function CtaSection({ signedIn }: { signedIn: boolean }) {
  const { orgRole } = useAuth();
  const dashboardHref = orgRole === "org:admin" ? "/admin" : "/dashboard";
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 50, scale: 0.97 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: cardRef.current,
            start: "top 85%",
          },
        }
      );
    });
    return () => ctx.revert();
  }, []);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-3xl border border-fedge-gold/20 bg-gradient-to-br from-fedge-mid/10 via-card to-fedge-gold/10 p-12 md:p-16 text-center opacity-0"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-1/2 bg-gradient-to-r from-transparent via-fedge-gold to-transparent" />
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-fedge-mid/15 blur-[80px]" />

          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            <span className="text-foreground">
              Start Fiscalising Today
            </span>
          </h2>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Join businesses already using Fiscal Gem to streamline their
            ZIMRA compliance. Get started in minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            {benefits.map((b) => (
              <div key={b} className="flex items-center gap-2 text-sm text-fedge-mid">
                <Check className="h-4 w-4" />
                {b}
              </div>
            ))}
          </div>

          {signedIn ? (
            <Link
              href={dashboardHref}
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fedge-mid to-fedge-dark px-10 py-4 text-lg font-semibold text-fedge-cream shadow-xl shadow-fedge-dark/25 transition-all hover:shadow-2xl hover:shadow-fedge-dark/40 hover:scale-105"
            >
              Go to Dashboard
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fedge-mid to-fedge-dark px-10 py-4 text-lg font-semibold text-fedge-cream shadow-xl shadow-fedge-dark/25 transition-all hover:shadow-2xl hover:shadow-fedge-dark/40 hover:scale-105"
            >
              Create Free Account
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
