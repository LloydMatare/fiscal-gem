# Phase 1: Project Scaffolding

**Status:** ✅ Complete  
**Duration:** Completed in initial setup

## Objective

Replace the Spring Boot Maven project with a Next.js TypeScript project using Clerk, Drizzle ORM, and Neon PostgreSQL.

## What Was Done

### Removed
- Entire `fdms-cloud-platform/` directory (Java 21, Spring Boot 3.5.7, Maven)
- `pom.xml`, `Dockerfile`, `docker-compose.yml`
- All Java source files (~331 files)

### Created

#### Next.js Project
- `package.json` — Next.js 16.2.10, React 19, TypeScript
- `next.config.ts` — serverExternalPackages for Neon, serverActions
- `tsconfig.json` — ES2017 target, bundler module resolution, `@/*` path alias

#### Dependencies Installed
```
@clerk/nextjs@7.5.20     — Authentication & organizations
drizzle-orm              — Type-safe SQL ORM
@neondatabase/serverless — Neon serverless PostgreSQL driver
drizzle-kit              — Schema management CLI (devDependency)
svix                     — Clerk webhook signature verification
```

#### Database Connection
- `src/db/index.ts` — Neon HTTP connection via `drizzle()` with schema

#### Configuration
- `.env.local.example` — Template for all required environment variables
- `drizzle.config.ts` — Drizzle Kit config pointing to `src/db/schema/*`

#### Directory Structure
```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API route handlers
│   │   ├── admin/                # Admin-only routes
│   │   ├── tenant/               # Tenant self-service routes
│   │   ├── s2s/                  # System-to-system routes
│   │   ├── fdms/                 # ZIMRA FDMS proxy routes
│   │   └── webhook/              # Webhook handlers
│   ├── layout.tsx                # Root layout with ClerkProvider
│   └── page.tsx                  # Home page with sign-in
├── db/                           # Database layer
│   ├── index.ts                  # Drizzle + Neon connection
│   └── schema/                   # Drizzle schema files
├── integration/                  # External API integrations
│   └── zimra/                    # ZIMRA FDMS integration
├── lib/                          # Shared utilities
├── middleware.ts                  # Clerk auth middleware
├── services/                     # Business logic services
├── types/                        # TypeScript types
└── utils/                        # Utility functions
keys/                             # Device certificate storage (gitignored)
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Yes | For webhook verification |
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `FDMS_BASE_URL` | No | ZIMRA FDMS base URL (default: test) |
| `FDMS_KEYS_PATH` | No | Device key storage path (default: ./keys) |
| `APP_ENCRYPTION_SECRET` | No | 32-char AES key for encryption |
