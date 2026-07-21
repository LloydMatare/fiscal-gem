"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FiscalGlobe } from "./fiscal-globe";
import { GridBackground } from "./grid-background";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export function HeroSection({ signedIn }: { signedIn: boolean }) {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        headlineRef.current,
        { opacity: 0, y: 60, clipPath: "inset(100% 0 0 0)" },
        { opacity: 1, y: 0, clipPath: "inset(0% 0 0 0)", duration: 1.2 }
      )
        .fromTo(
          subRef.current,
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.8 },
          "-=0.5"
        )
        .fromTo(
          ctaRef.current,
          { opacity: 0, y: 30, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.7 },
          "-=0.3"
        );
    });

    return () => ctx.revert();
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <GridBackground />
      <FiscalGlobe />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-fedge-gold/30 bg-fedge-gold/10 px-4 py-1.5 text-sm text-fedge-gold mb-8">
          <span className="h-2 w-2 rounded-full bg-fedge-gold animate-pulse" />
          ZIMRA Certified Fiscalisation Platform
        </div>

        <h1
          ref={headlineRef}
          className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 opacity-0"
        >
          <span className="bg-gradient-to-r from-white via-fedge-cream to-fedge-gold bg-clip-text text-transparent">
            Fiscal Made
          </span>
          <br />
          <span className="bg-gradient-to-r from-fedge-gold to-fedge-mid bg-clip-text text-transparent">
            Effortless
          </span>
        </h1>

        <p
          ref={subRef}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 opacity-0"
        >
          The modern middleware between your business and ZIMRA FDMS.
          Real-time receipt fiscalisation, device management, and
          compliance — all in one platform.
        </p>

        <div ref={ctaRef} className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0">
          {signedIn ? (
            <Link
              href="/admin"
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-fedge-mid to-fedge-dark px-8 py-3.5 text-base font-semibold text-fedge-cream shadow-lg shadow-fedge-dark/25 transition-all hover:shadow-xl hover:shadow-fedge-dark/40 hover:scale-105"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-fedge-mid to-fedge-dark px-8 py-3.5 text-base font-semibold text-fedge-cream shadow-lg shadow-fedge-dark/25 transition-all hover:shadow-xl hover:shadow-fedge-dark/40 hover:scale-105"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
          <a
            href="#features"
            className="flex items-center gap-2 rounded-xl border border-fedge-gold/20 bg-fedge-gold/5 px-8 py-3.5 text-base font-medium text-fedge-cream/80 backdrop-blur-sm transition-all hover:bg-fedge-gold/10 hover:text-fedge-cream"
          >
            Learn More
          </a>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10" />
    </section>
  );
}
