# FiscalGem

FiscalGem is a multi-tenant SaaS for operating Zimbabwe FDMS devices (Fiscal Device Gateway API v7.2). It pairs a Next.js App Router frontend with Clerk auth, Neon Postgres, and Drizzle ORM.

## Stack

- Next.js 16 (App Router)
- Clerk for authentication and organizations
- Neon Postgres + Drizzle ORM
- Tailwind CSS

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example` and set values:

```bash
cp .env.example .env.local
```

3. Run the dev server:

```bash
npm run dev
```

## Environment variables

Required:

- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `FDMS_BASE_URL` (test or prod)
- `FDMS_API_PATH_PREFIX` (verify with the FDMS Swagger)

Optional:

- `FDMS_CLIENT_CERT_PEM`
- `FDMS_CLIENT_KEY_PEM`
- `FDMS_RECEIPT_BASE_URL`

## Drizzle

Generate migrations (once you have a database):

```bash
drizzle-kit generate
```

Apply migrations (use your preferred runner):

```bash
drizzle-kit migrate
```

## FDMS integration

The project includes server-side API routes for the public FDMS endpoints:

- `POST /api/fdms/verify-taxpayer`
- `POST /api/fdms/register-device`
- `POST /api/fdms/get-server-certificate`

Mutual TLS is required for other FDMS endpoints. Provide PEM certificate and key via env variables to enable mTLS requests in `lib/fdms/client.ts`.

## Notes

- Update `FDMS_API_PATH_PREFIX` to match the API path shown in the FDMS Swagger UI.
- Replace the demo UI data in dashboard pages with real queries via Drizzle.
