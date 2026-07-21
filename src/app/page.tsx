"use client";

import { useAuth } from "@clerk/nextjs";
import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { StatsSection } from "@/components/landing/stats-section";
import { CtaSection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  const { isSignedIn } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar signedIn={isSignedIn ?? false} />
      <main className="pt-16">
        <HeroSection signedIn={isSignedIn ?? false} />
        <FeaturesSection />
        <HowItWorksSection />
        <StatsSection />
        <CtaSection signedIn={isSignedIn ?? false} />
      </main>
      <Footer />
    </div>
  );
}
