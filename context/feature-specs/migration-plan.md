# Migration Plan: Spring Boot + Keycloak → Next.js + Clerk + Neon + Drizzle

## Overview

This document tracks the full migration of the **fdms-cloud-platform** (Java 21 / Spring Boot 3.5.7 / Keycloak / PostgreSQL) into **fiscal-gem-api** (Next.js 16 / Clerk / Neon / Drizzle ORM).

## Source Project

- **Location (archived):** `/home/kronos/Apps/fiscal-gem-api/fdms-cloud-platform/`
- **Package:** `com.beymo.fiscal_edge`
- **Build:** Maven, Java 21, Spring Boot 3.5.7
- **Scale:** ~331 Java source files, ~30 test files, 11 domain modules

## Target Stack

| Layer | Old | New |
|---|---|---|
| Runtime | Java 21 / Spring Boot 3.5.7 | Node.js / Next.js 16 (App Router) |
| Auth / Identity | Keycloak 26.0.7 (OIDC/JWT) | Clerk (Organizations + roles) |
| Database | PostgreSQL 16 (Hibernate JPA) | Neon Serverless PostgreSQL + Drizzle ORM |
| API Style | Spring MVC Controllers | Next.js Route Handlers |
| Multi-tenancy | Keycloak JWT `tenantId` claim + `TenantFilter` | Clerk Organizations + middleware |
| Crypto | BouncyCastle 1.78.1 (EC keys, CSR) | Node.js `crypto` module (EC, SHA256) |
| mTLS | Apache HttpClient5 + `MtlsSslContextFactory` | Node.js `https.Agent` with per-device certs |
| Payments | Paynow SDK 1.1.2 | Deferred (Phase 8) |
| Containerization | Docker Compose (3 services) | Vercel / Docker (single Next.js app) |

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Multi-tenancy model | Clerk Organizations | Each client = Clerk org. Admins are org:admin. Tenant users are org:member. |
| S2S authentication | API key in header | Agents send `x-api-key` header, validated against hashed key in DB. |
| mTLS in Next.js | `https.Agent` per request | Node.js native TLS handles per-device client certificates. |
| CSR generation | Node.js `crypto` | EC P-256 key pairs + CSR built with minimal ASN.1 encoding. |
| Schema management | Drizzle Kit (`push` / `migrate`) | Replaces Hibernate `ddl-auto: update`. |

## Scope

### Backend (Phases 1–8)
- Client / Shop / Device / Agent management
- Fiscal Day lifecycle (open, close, status, ping)
- Receipt submission and fiscalisation pipeline
- ZIMRA FDMS integration (device APIs, receipt APIs, public API)
- Certificate management (CSR generation, PEM storage, mTLS)
- Auth & multi-tenancy (Clerk)
- Database schema (Drizzle)
- Billing / Invoicing (Phase 8 — deferred)

### Frontend (Phases 9–11)
- Shared UI component library (Tailwind + shadcn/ui)
- Admin dashboard (full platform management)
- Tenant dashboard (self-service for businesses)

## Phase Breakdown

### Backend

| Phase | Name | Status | Spec |
|---|---|---|---|
| 1 | Project scaffolding | ✅ Done | [phase-1-scaffolding.md](./phase-1-scaffolding.md) |
| 2 | Database schema | ✅ Done | [phase-2-database-schema.md](./phase-2-database-schema.md) |
| 3 | Auth & multi-tenancy | ✅ Done | [phase-3-auth-multitenancy.md](./phase-3-auth-multitenancy.md) |
| 4 | Core API routes | ✅ Done | [phase-4-core-api-routes.md](./phase-4-core-api-routes.md) |
| 5 | ZIMRA FDMS integration | ✅ Done | [phase-5-zimra-integration.md](./phase-5-zimra-integration.md) |
| 6 | Certificate management | ✅ Done | [phase-6-certificate-management.md](./phase-6-certificate-management.md) |
| 7 | Testing & validation | ✅ Done | [phase-7-testing-validation.md](./phase-7-testing-validation.md) |
| 8 | Billing & payments | ⏳ Deferred | [phase-8-billing-payments.md](./phase-8-billing-payments.md) |

### Frontend

| Phase | Name | Status | Spec |
|---|---|---|---|
| 9 | Shared UI components | ⏳ Pending | [phase-9-shared-components.md](./phase-9-shared-components.md) |
| 10 | Admin frontend | ⏳ Pending | [phase-10-admin-frontend.md](./phase-10-admin-frontend.md) |
| 11 | Tenant frontend | ⏳ Pending | [phase-11-tenant-frontend.md](./phase-11-tenant-frontend.md) |

## Entity Relationship (Drizzle Schema)

```
clients (1) ──< (N) shops
clients (1) ──< (N) devices
clients (1) ──< (N) user_accounts
clients (1) ──< (N) fiscal_days (via devices)
clients (1) ──< (N) fiscal_receipts

shops (1) ──< (N) agents
shops (1) ─── (1) shop_database_configs

devices (1) ──< (N) agents
devices (1) ──< (N) fiscal_days
devices (1) ──< (N) fiscal_receipts

fiscal_days (1) ──< (N) fiscal_receipts
```

## API Route Map

```
/api/
├── admin/
│   └── clients/
│       ├── GET, POST                          # List / create clients
│       └── [clientId]/
│           ├── GET, PUT, PATCH, DELETE         # Client CRUD
│           ├── device/
│           │   └── GET, POST                   # List / register devices
│           ├── shops/
│           │   ├── GET, POST                   # List / create shops
│           │   └── [shopId]/
│           │       ├── GET, PUT, PATCH, DELETE # Shop CRUD
│           │       └── agents/
│           │           └── GET, POST           # List / create agents
│           └── receipts/
│               ├── GET                         # List receipts
│               └── [receiptId]/
│                   └── GET                     # Get receipt detail
├── tenant/
│   ├── client/
│   │   └── GET, PATCH                         # Profile get/update
│   ├── shops/
│   │   ├── GET, POST                          # List / create shops
│   │   └── [shopId]/
│   │       ├── GET, PUT                       # Shop get/update
│   │       └── agents/
│   │           └── GET                        # List agents
│   └── receipts/
│       └── GET                                # List receipts
├── s2s/
│   ├── agent/
│   │   ├── GET                                # Get config
│   │   └── PATCH                              # Activate / heartbeat
│   ├── receipts/
│   │   └── POST                               # Submit receipt
│   └── fiscal-day/
│       ├── GET                                # Get fiscal day
│       └── POST                               # Open / close / status / ping
├── fdms/
│   └── public/
│       └── GET, POST                          # Server cert / verify taxpayer
└── webhook/
    └── clerk/
        └── POST                               # Clerk webhook handler
```
