"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Upload, Cpu, FileCheck, BarChart3 } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Register Device",
    description: "Register your fiscal device with ZIMRA via our API. We handle the CSR generation and certificate management.",
  },
  {
    icon: Cpu,
    step: "02",
    title: "Submit Receipts",
    description: "Send receipt data through our S2S API. We forward it to ZIMRA FDMS via mTLS and return the fiscal code.",
  },
  {
    icon: FileCheck,
    step: "03",
    title: "Track Status",
    description: "Monitor receipt fiscalisation status in real-time. Automatic retries ensure no receipt is lost.",
  },
  {
    icon: BarChart3,
    step: "04",
    title: "Reconcile",
    description: "Open and close fiscal days with full counters. Export reports for your accounting workflow.",
  },
];

export function HowItWorksSection() {
  const headingRef = useRef<HTMLDivElement>(null);

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
        ".step-card",
        { opacity: 0, x: -60 },
        {
          opacity: 1,
          x: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.2,
          scrollTrigger: {
            trigger: ".steps-grid",
            start: "top 80%",
          },
        }
      );
    });
    return () => ctx.revert();
  }, []);

  return (
    <section id="how-it-works" className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <div ref={headingRef} className="text-center mb-16 opacity-0">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="text-foreground">
              How It Works
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From device registration to receipt reconciliation — four simple steps to full ZIMRA compliance.
          </p>
        </div>

        <div className="steps-grid grid md:grid-cols-2 gap-6">
          {steps.map((step) => (
            <div
              key={step.step}
              className="step-card group relative rounded-2xl border border-fedge-gold/10 bg-card/50 p-8 backdrop-blur-sm transition-all duration-300 hover:border-fedge-gold/30 hover:bg-card opacity-0"
            >
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0">
                  <div className="inline-flex items-center justify-center rounded-xl bg-fedge-mid/10 p-3">
                    <step.icon className="h-6 w-6 text-fedge-mid" />
                  </div>
                </div>
                <div>
                  <div className="text-xs font-mono text-fedge-gold/70 mb-1">
                    STEP {step.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
