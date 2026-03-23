import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ClerkProvider } from "@clerk/nextjs";
import { MultisessionAppSupport } from "./components/MultisessionAppSupport";
import { Toaster } from "sonner";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-brand-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-brand-mono",
});

export const metadata: Metadata = {
  title: "Fiscal Gem | FDMS Gateway SaaS",
  description:
    "Operate ZIMRA FDMS devices with real-time status, receipt submission, and compliance workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", bricolage.variable, plexMono.variable)}>
      <body className="antialiased">
        <ClerkProvider afterMultiSessionSingleSignOutUrl="/">
          <MultisessionAppSupport>{children}</MultisessionAppSupport>
        </ClerkProvider>
        <Toaster />
      </body>
    </html>
  );
}
