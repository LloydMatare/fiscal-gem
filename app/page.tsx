"use client";

import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

const steps = [
  {
    title: "Verify taxpayer",
    detail:
      "Check activation keys and branch details before you register a device with FDMS.",
  },
  {
    title: "Register device",
    detail:
      "Generate CSR, request FDMS device certificates, and store compliance metadata.",
  },
  {
    title: "Operate fiscal day",
    detail:
      "Open, monitor, and close fiscal days with live counters and alerting.",
  },
  {
    title: "Submit receipts",
    detail:
      "Track receipt submissions, QR URLs, and reconciliation status per day.",
  },
];

const features = [
  {
    title: "FDMS-aware workflows",
    detail:
      "Designed around gateway endpoints like verifyTaxpayerInformation, registerDevice, openDay, and submitReceipt.",
  },
  {
    title: "Multi-tenant by default",
    detail:
      "Clerk organizations map to FDMS devices, fiscal days, and receipts with row-level tenancy.",
  },
  {
    title: "Audit-grade storage",
    detail:
      "Neon + Drizzle schemas keep immutable payloads, signatures, and operational logs.",
  },
  {
    title: "Operational dashboards",
    detail:
      "Track device status, fiscal day counters, and file submissions from a single console.",
  },
];

const integrations = [
  {
    label: "FDMS v7.2",
    value: "API-first integration with mutual TLS support.",
  },
  {
    label: "Neon Postgres",
    value: "Serverless-ready DB with branching for test vs prod devices.",
  },
  {
    label: "Drizzle ORM",
    value: "Typed schemas for receipts, files, and fiscal day state.",
  },
  {
    label: "Clerk Auth",
    value: "Secure org-based access, roles, and session management.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f6f2ea] text-[#1e1a17]">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-10 top-10 h-56 w-56 rounded-full bg-[#f0c98d] opacity-40 blur-3xl" />
          <div className="absolute right-10 top-24 h-64 w-64 rounded-full bg-[#9ed8d0] opacity-40 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#d8a7c7] opacity-30 blur-3xl" />
        </div>
        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1e1a17] text-[#f6f2ea] text-lg font-semibold">
              FG
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6a5f57]">
                FiscalGem
              </p>
              <p className="text-xs text-[#6a5f57]">FDMS Gateway SaaS</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-[#463f3a] md:flex">
            <a href="#workflow" className="hover:text-[#1e1a17]">
              Workflow
            </a>
            <a href="#integrations" className="hover:text-[#1e1a17]">
              Integrations
            </a>
            <a href="#pricing" className="hover:text-[#1e1a17]">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <SignedOut>
              <SignInButton>
                <button className="rounded-full border border-[#1e1a17]/20 px-4 py-2 font-semibold text-[#1e1a17]">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton>
                <button className="rounded-full bg-[#1e1a17] px-4 py-2 font-semibold text-[#f6f2ea]">
                  Start free
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="rounded-full bg-[#1e1a17] px-4 py-2 font-semibold text-[#f6f2ea]"
              >
                Dashboard
              </Link>
              <UserButton />
            </SignedIn>
          </div>
        </header>

        <section className="relative z-10 mx-auto grid w-full max-w-6xl gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[#1e1a17]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1e1a17]">
              FDMS v7.2 ready
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-[#1e1a17] md:text-6xl">
              Operate every fiscal device with one compliance cockpit.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-[#463f3a]">
              FiscalGem is a multi-tenant SaaS built for Zimbabwe FDMS operations.
              Register devices, open fiscal days, and submit receipts with auditable
              trails powered by Neon, Drizzle, and Clerk.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <SignedOut>
                <SignUpButton>
                  <button className="rounded-full bg-[#1e1a17] px-6 py-3 text-sm font-semibold text-[#f6f2ea]">
                    Launch workspace
                  </button>
                </SignUpButton>
                <SignInButton>
                  <button className="rounded-full border border-[#1e1a17]/20 px-6 py-3 text-sm font-semibold text-[#1e1a17]">
                    View demo
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/dashboard"
                  className="rounded-full bg-[#1e1a17] px-6 py-3 text-sm font-semibold text-[#f6f2ea]"
                >
                  Go to dashboard
                </Link>
              </SignedIn>
            </div>
          </div>
          <div className="rounded-3xl border border-[#1e1a17]/10 bg-white/80 p-6 shadow-[0_20px_60px_rgba(30,26,23,0.18)]">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-[#6a5f57]">
              <span>Device status</span>
              <span className="rounded-full bg-[#e6f4f2] px-3 py-1 text-[#2a6f67]">
                Online
              </span>
            </div>
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-[#1e1a17]/10 bg-[#f6f2ea] p-4">
                <p className="text-sm font-semibold">ZIMRA-SN: 001</p>
                <p className="text-xs text-[#6a5f57]">Device ID 187 • Harare CBD</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[#6a5f57]">Fiscal day</p>
                    <p className="text-sm font-semibold">Open • Day 31</p>
                  </div>
                  <div>
                    <p className="text-[#6a5f57]">Receipts today</p>
                    <p className="text-sm font-semibold">168</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-[#1e1a17]/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#6a5f57]">
                  Next action
                </p>
                <p className="mt-2 text-sm font-semibold">
                  Close fiscal day by 18:00
                </p>
                <p className="text-xs text-[#6a5f57]">
                  Remaining window: 5h 12m
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section
        id="workflow"
        className="mx-auto w-full max-w-6xl px-6 py-16"
      >
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <h2 className="text-3xl font-semibold">FDMS workflow, mapped step by step</h2>
          <p className="max-w-xl text-sm text-[#6a5f57]">
            Every core endpoint is reflected in the workspace so teams can plan,
            approve, and execute fiscal actions without losing context.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {steps.map((step) => (
            <div
              key={step.title}
              className="rounded-3xl border border-[#1e1a17]/10 bg-white/70 p-6"
            >
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="mt-3 text-sm text-[#6a5f57]">{step.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-16">
        <div className="grid gap-6 rounded-3xl border border-[#1e1a17]/10 bg-[#1e1a17] p-10 text-[#f6f2ea] md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#f0c98d]">
              Compliance deck
            </p>
            <h2 className="mt-4 text-3xl font-semibold">
              Built for auditors, loved by operators.
            </h2>
            <p className="mt-4 text-sm text-[#f6f2ea]/80">
              Store every request/response payload, certificate event, and fiscal
              day counter in Neon. Drizzle schemas keep every record typed and
              queryable for reconciliation.
            </p>
          </div>
          <div className="rounded-2xl border border-[#f6f2ea]/10 bg-[#2a2421] p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[#9ed8d0]">
              Live view
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Pending receipts</span>
                <span className="font-semibold">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Files awaiting status</span>
                <span className="font-semibold">3</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Certificate expiring</span>
                <span className="font-semibold">14 days</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="integrations"
        className="mx-auto w-full max-w-6xl px-6 pb-16"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <h2 className="text-3xl font-semibold">Core integrations</h2>
          <p className="max-w-xl text-sm text-[#6a5f57]">
            The stack is pre-wired to run FDMS workflows with the right security
            and tenancy posture.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {integrations.map((integration) => (
            <div
              key={integration.label}
              className="flex items-center justify-between rounded-2xl border border-[#1e1a17]/10 bg-white/70 p-5"
            >
              <div>
                <p className="text-sm font-semibold">{integration.label}</p>
                <p className="text-xs text-[#6a5f57]">{integration.value}</p>
              </div>
              <span className="text-xs font-semibold text-[#2a6f67]">Ready</span>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="text-3xl font-semibold">Simple pricing for every branch</h2>
            <p className="mt-4 text-sm text-[#6a5f57]">
              Start with one fiscal device and expand across branches. All plans
              include FDMS workflows, audit logs, and multi-tenant controls.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-[#463f3a]">
              {features.map((feature) => (
                <li key={feature.title} className="rounded-xl bg-white/70 p-4">
                  <p className="font-semibold">{feature.title}</p>
                  <p className="text-xs text-[#6a5f57]">{feature.detail}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-[#1e1a17]/10 bg-white/80 p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-[#6a5f57]">
              Launch plan
            </p>
            <p className="mt-4 text-4xl font-semibold">$79</p>
            <p className="text-sm text-[#6a5f57]">per device / month</p>
            <div className="mt-6 space-y-3 text-sm text-[#463f3a]">
              <p>Included:</p>
              <p>Up to 3 users</p>
              <p>Device registration + certificate management</p>
              <p>Receipt & file submission console</p>
              <p>Support for test and production environments</p>
            </div>
            <SignedOut>
              <SignUpButton>
                <button className="mt-8 w-full rounded-full bg-[#1e1a17] px-6 py-3 text-sm font-semibold text-[#f6f2ea]">
                  Start free trial
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="mt-8 block w-full rounded-full bg-[#1e1a17] px-6 py-3 text-center text-sm font-semibold text-[#f6f2ea]"
              >
                Manage workspace
              </Link>
            </SignedIn>
          </div>
        </div>
      </section>
    </div>
  );
}
