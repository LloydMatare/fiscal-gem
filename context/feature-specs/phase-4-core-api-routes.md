# Phase 4: Core API Routes

**Status:** ✅ Complete

## Objective

Implement all REST API endpoints for the core business domains: clients, shops, devices, agents, fiscal days, and receipts. Map Spring Boot controller logic to Next.js route handlers.

## Route Summary

**20 API route handlers** across 4 route groups.

## Admin Routes (`/api/admin/`)

### Clients

| Method | Path | Handler | Description |
|---|---|---|---|
| GET | `/admin/clients` | `route.ts` | List clients (paginated, searchable) |
| POST | `/admin/clients` | `route.ts` | Create client (auto-generates tenantCode) |
| GET | `/admin/clients/[clientId]` | `route.ts` | Get client detail |
| PUT | `/admin/clients/[clientId]` | `route.ts` | Update client |
| PATCH | `/admin/clients/[clientId]` | `route.ts` | Soft delete / restore |
| DELETE | `/admin/clients/[clientId]` | `route.ts` | Hard delete |

**Query params:** `page`, `limit`, `search`, `status`

### Shops

| Method | Path | Handler | Description |
|---|---|---|---|
| GET | `/admin/clients/[clientId]/shops` | `route.ts` | List shops for client |
| POST | `/admin/clients/[clientId]/shops` | `route.ts` | Create shop |
| GET | `/admin/clients/[clientId]/shops/[shopId]` | `route.ts` | Get shop detail |
| PUT | `/admin/clients/[clientId]/shops/[shopId]` | `route.ts` | Update shop |
| PATCH | `/admin/clients/[clientId]/shops/[shopId]` | `route.ts` | Soft delete / restore |
| DELETE | `/admin/clients/[clientId]/shops/[shopId]` | `route.ts` | Hard delete |

### Agents

| Method | Path | Handler | Description |
|---|---|---|---|
| GET | `/admin/clients/[clientId]/shops/[shopId]/agents` | `route.ts` | List agents |
| POST | `/admin/clients/[clientId]/shops/[shopId]/agents` | `route.ts` | Create agent (generates API key + agent number) |

**POST response includes raw `apiKey` (shown once only).**

### Device

| Method | Path | Handler | Description |
|---|---|---|---|
| GET | `/admin/clients/[clientId]/device` | `route.ts` | List devices |
| POST | `/admin/clients/[clientId]/device` | `route.ts` | Register device (generates CSR + saves keys) |

### Receipts

| Method | Path | Handler | Description |
|---|---|---|---|
| GET | `/admin/clients/[clientId]/receipts` | `route.ts` | List receipts (filterable by status) |
| GET | `/admin/clients/[clientId]/receipts/[receiptId]` | `route.ts` | Get receipt detail |

## Tenant Routes (`/api/tenant/`)

| Method | Path | Handler | Description |
|---|---|---|---|
| GET | `/tenant/client` | `route.ts` | Get current tenant profile |
| PATCH | `/tenant/client` | `route.ts` | Update profile |
| GET | `/tenant/shops` | `route.ts` | List tenant's shops |
| POST | `/tenant/shops` | `route.ts` | Create shop |
| GET | `/tenant/shops/[shopId]` | `route.ts` | Get shop detail |
| PUT | `/tenant/shops/[shopId]` | `route.ts` | Update shop |
| GET | `/tenant/shops/[shopId]/agents` | `route.ts` | List agents |
| GET | `/tenant/receipts` | `route.ts` | List receipts |

## S2S Routes (`/api/s2s/`)

### Agent Management

| Method | Path | Handler | Description |
|---|---|---|---|
| GET | `/s2s/agent` | `route.ts` | Get agent config (query param: agentId) |
| PATCH | `/s2s/agent` | `route.ts` | Activate / heartbeat |

**PATCH body:** `{ agentId, action: "activate"|"heartbeat", online, lastIpAddress, agentVersion }`

### Receipt Submission

| Method | Path | Handler | Description |
|---|---|---|---|
| POST | `/s2s/receipts` | `route.ts` | Submit receipt from agent |

**POST body:**
```json
{
  "clientId": "uuid",
  "deviceId": "uuid",
  "shopId": "uuid (optional)",
  "fiscalDayId": "uuid (optional)",
  "externalReference": "string (unique per client)",
  "receiptType": "STANDARD",
  "invoiceNo": "string",
  "originalPayloadJson": "string",
  "fiscalPayloadJson": "string (required)"
}
```

**Processing pipeline:**
1. Validate required fields
2. Check for duplicate externalReference
3. Get last receipt for chain hash
4. Compute receipt chain hash
5. Attempt to sign with device private key
6. Insert receipt (status: SIGNED or RECEIVED)

### Fiscal Day Management

| Method | Path | Handler | Description |
|---|---|---|---|
| GET | `/s2s/fiscal-day` | `route.ts` | Get fiscal day (query params) |
| POST | `/s2s/fiscal-day` | `route.ts` | Open / close / status / ping |

**POST body:**
```json
{
  "action": "open-day" | "close-day" | "status" | "ping",
  "clientId": "uuid",
  "deviceId": "uuid",
  "fiscalDayNo": 1,
  "closeRequest": { ... }
}
```

## Response Format

All routes use standardized responses from `src/lib/api-response.ts`:

```json
// Success
{ "data": { ... } }

// Paginated
{ "data": [...], "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 } }

// Error
{ "error": { "message": "...", "statusCode": 400, "errors": [...] } }
```

## Key Differences from Spring Boot

| Spring Boot | Next.js |
|---|---|
| `@RestController` + `@RequestMapping` | `src/app/api/*/route.ts` |
| `@PathVariable` | Route segment `[param]` |
| `@RequestParam` | `searchParams` from URL |
| `@RequestBody` | `req.json()` |
| `@PreAuthorize` | `requireAdmin()` / `requireTenant()` |
| `Pageable` + `PageResponse` | Custom pagination with `getSearchParams()` |
| `ResponseEntity<T>` | `NextResponse.json()` via `apiSuccess()` |
