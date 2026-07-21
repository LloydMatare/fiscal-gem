"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Shield, Zap, BarChart3, Smartphone, Globe, Key } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: Zap,
    title: "Real-Time Fiscalisation",
    description: "Submit receipts to ZIMRA FDMS in under 500ms with automatic retry logic and status tracking.",
  },
  {
    icon: Shield,
    title: "End-to-End Security",
    description: "EC P-256 CSR generation, mTLS device certificates, and encrypted receipt payloads.",
  },
  {
    icon: Smartphone,
    title: "Device Management",
    description: "Register, activate, and monitor unlimited fiscal devices across all your shop locations.",
  },
  {
    icon: BarChart3,
    title: "Fiscal Day Control",
    description: "Open, close, and reconcile fiscal days with full audit trails and receipt counters.",
  },
  {
    icon: Globe,
    title: "Multi-Tenant Architecture",
    description: "Manage multiple businesses from a single dashboard with role-based access control.",
  },
  {
    icon: Key,
    title: "S2S API Access",
    description: "Secure server-to-server API keys with SHA-256 hashing for automated integrations.",
  },
];

export function FeaturesSection() {
  const headingRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        headingRef.current,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: headingRef.current,
            start: "top 85%",
          },
        }
      );

      gsap.fromTo(
        ".feature-card",
        { opacity: 0, y: 60, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 80%",
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <section id="features" className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <div ref={headingRef} className="text-center mb-16 opacity-0">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="text-foreground">
              Built for Compliance
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to integrate with Zimbabwe&apos;s fiscal system — from device registration to receipt fiscalisation.
          </p>
        </div>

        <div ref={gridRef} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="feature-card group relative rounded-2xl border border-fedge-gold/10 bg-card/50 p-8 backdrop-blur-sm transition-all duration-300 hover:border-fedge-gold/30 hover:bg-card hover:shadow-lg hover:shadow-fedge-dark/5 opacity-0"
            >
              <div className="mb-5 inline-flex items-center justify-center rounded-xl bg-fedge-mid/10 p-3">
                <feature.icon className="h-6 w-6 text-fedge-mid" />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
