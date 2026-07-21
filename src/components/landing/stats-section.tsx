"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const stats = [
  { value: 500, suffix: "ms", label: "Average Fiscalisation Time" },
  { value: 99.9, suffix: "%", label: "Uptime SLA" },
  { value: 10, suffix: "K+", label: "Receipts Processed Daily" },
  { value: 100, suffix: "%", label: "ZIMRA Compliant" },
];

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: ref.current,
        start: "top 90%",
        onEnter: () => {
          const obj = { val: 0 };
          gsap.to(obj, {
            val: target,
            duration: 2,
            ease: "power2.out",
            onUpdate: () => {
              setCount(target >= 100 ? Math.round(obj.val) : parseFloat(obj.val.toFixed(1)));
            },
          });
        },
        once: true,
      });
    }, ref);
    return () => ctx.revert();
  }, [target]);

  return (
    <span ref={ref}>
      {count}{suffix}
    </span>
  );
}

export function StatsSection() {
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        bgRef.current,
        { opacity: 0, scale: 0.95 },
        {
          opacity: 1,
          scale: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: bgRef.current,
            start: "top 80%",
          },
        }
      );
    });
    return () => ctx.revert();
  }, []);

  return (
    <section className="relative py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div ref={bgRef} className="relative overflow-hidden rounded-3xl border border-fedge-gold/15 bg-gradient-to-br from-fedge-mid/10 via-card to-fedge-gold/10 p-12 md:p-16 opacity-0">
          <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-fedge-mid/10 blur-[100px]" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-fedge-gold/10 blur-[100px]" />

          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-fedge-mid mb-2">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
