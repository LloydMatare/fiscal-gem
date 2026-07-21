# Phase 2: Database Schema

**Status:** ✅ Complete

## Objective

Translate all JPA/Hibernate entities from the Spring Boot project into Drizzle ORM schema definitions for Neon PostgreSQL.

## Schema Files

| File | Table | Description |
|---|---|---|
| `src/db/schema/client.ts` | `clients` | Tenant organizations with Clerk org mapping |
| `src/db/schema/shop.ts` | `shops` | Physical shops/branches per client |
| `src/db/schema/shop.ts` | `shop_database_configs` | External DB config per shop |
| `src/db/schema/device.ts` | `devices` | Fiscal devices registered with ZIMRA |
| `src/db/schema/agent.ts` | `agents` | POS agents installed at shops |
| `src/db/schema/fiscal-day.ts` | `fiscal_days` | Fiscal day lifecycle per device |
| `src/db/schema/receipt.ts` | `fiscal_receipts` | Individual fiscal receipts |
| `src/db/schema/user-account.ts` | `user_accounts` | User accounts (Clerk-linked) |
| `src/db/schema/index.ts` | — | Barrel export |

## Entity Details

### clients
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `name` | text | Business name |
| `tax_id` | text | Tax identification number |
| `registration_number` | text | Business registration |
| `tenant_code` | text | Unique tenant code (UK) |
| `clerk_org_id` | text | Maps to Clerk organization (unique) |
| `status` | text enum | ACTIVE / INACTIVE / SUSPENDED |
| `currency` | text | Default: USD |
| `time_zone` | text | Default: Africa/Harare |
| `deleted` | boolean | Soft delete flag |
| `zimra_device_id` | integer | ZIMRA device ID |
| `created_at`, `updated_at` | timestamp | Audit timestamps |
| `created_by`, `last_modified_by` | text | Audit user tracking |

### shops
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `name` | text | |
| `client_id` | UUID (FK) | → clients.id, cascade delete |
| `deleted` | boolean | Soft delete |
| `city`, `address` | text | Location |
| `contact_person`, `contact_phone` | text | Contact info |

### devices
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `device_id` | integer | ZIMRA integer ID |
| `serial_number` | text | Device serial |
| `client_id` | UUID (FK) | → clients.id, cascade delete |
| `csr` | text | Certificate signing request |
| `certificate` | text | Device certificate from ZIMRA |
| `common_name` | text | CN for CSR |
| `activated` | boolean | Activation status |
| UK: `(client_id, device_id)` | | Unique constraint |

### agents
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `shop_id` | UUID (FK) | → shops.id |
| `device_id` | UUID (FK) | → devices.id, nullable |
| `agent_number` | text | Unique agent identifier |
| `api_key_hash` | text | SHA-256 hashed API key |
| `status` | text enum | ACTIVE / INACTIVE / SUSPENDED / DELETED |
| `online` | boolean | Current online status |
| `last_seen` | timestamp | Last heartbeat |
| `type` | text enum | POS / BACK_OFFICE / MOBILE / KIOSK |

### fiscal_days
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `client_id` | UUID (FK) | |
| `device_id` | UUID (FK) | |
| `fiscal_day_no` | integer | Sequential day number |
| `status` | text enum | OPENED / CLOSE_INITIATED / CLOSED / CLOSE_FAILED |
| `open_operation_id` | text | ZIMRA operation ID |
| `close_operation_id` | text | ZIMRA operation ID |
| `fiscal_day_counters_json` | text | JSON counters from ZIMRA |
| `fiscal_day_device_signature*` | text | Device signature data |
| `fiscal_day_server_signature*` | text | Server signature data |
| `fdms_open_response_json` | text | Raw ZIMRA response |
| `fdms_close_response_json` | text | Raw ZIMRA response |
| `submit_file_*` | various | Submit file tracking |
| UK: `(client_id, device_id, fiscal_day_no)` | | |

### fiscal_receipts
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `client_id` | UUID (FK) | |
| `device_id` | UUID (FK) | |
| `shop_id` | UUID (FK) | nullable |
| `fiscal_day_id` | UUID (FK) | nullable |
| `external_reference` | text | Unique per client |
| `fiscal_payload_json` | text | The payload sent to ZIMRA |
| `signed_payload_json` | text | Signed version |
| `fdms_response_json` | text | ZIMRA response |
| `status` | text enum | RECEIVED → VALIDATED → SIGNED → SENT → ACCEPTED/FISCALISED |
| `receipt_global_no` | integer | Global receipt number |
| UK: `(client_id, external_reference)` | | |

### user_accounts
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `clerk_user_id` | text | Maps to Clerk user (unique) |
| `client_id` | UUID (FK) | |
| `username`, `email`, `full_name` | text | User info |
| `status` | text enum | ACTIVE / INACTIVE / SUSPENDED / DELETED |
| `last_login` | timestamp | |

## Indexes

All tables have primary key indexes. Additional indexes:
- `clients`: tenant_code (unique), clerk_org_id (unique), status
- `shops`: client_id
- `devices`: client_id, (client_id, device_id) unique
- `agents`: shop_id, device_id
- `fiscal_days`: (client_id, device_id, status), (client_id, device_id, fiscal_day_no) unique
- `fiscal_receipts`: client_id, (client_id, status), (client_id, device_id, fiscal_day_no), (status, received_at)
- `user_accounts`: client_id

## Migration from Spring Boot

| JPA Concept | Drizzle Equivalent |
|---|---|
| `@GeneratedValue(strategy = GenerationType.UUID)` | `.defaultRandom()` |
| `@Enumerated(EnumType.STRING)` | `text("col", { enum: [...] })` |
| `@ManyToOne(fetch = FetchType.LAZY)` | `uuid("col").references(() => table.id)` |
| `@OneToMany(mappedBy = "client")` | Not in schema (resolved via query) |
| `@Column(columnDefinition = "TEXT")` | `text("col")` |
| `BaseEntity` audit fields | Explicit columns with `.defaultNow()` |
| `ddl-auto: update` | `npx drizzle-kit push` |

## Commands

```bash
# Push schema to Neon
npx drizzle-kit push

# Generate migrations
npx drizzle-kit generate

# Open Drizzle Studio
npx drizzle-kit studio
```

## Notes

- `drizzle.config.ts` uses `dotenv` to load `.env.local` since drizzle-kit doesn't auto-load it.
- The `@neondatabase/serverless` driver connects via WebSocket — works with Neon's serverless pool.
