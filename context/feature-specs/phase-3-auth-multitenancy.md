# Phase 3: Auth & Multi-tenancy

**Status:** ✅ Complete

## Objective

Replace Keycloak JWT-based authentication with Clerk Organizations. Implement role-based access control (ADMIN / TENANT / SERVICE) and tenant context resolution.

## Auth Architecture

### Keycloak → Clerk Mapping

| Keycloak | Clerk | Notes |
|---|---|---|
| Realm | Clerk Application | Single Clerk app |
| Realm roles: ADMIN, TENANT, SERVICE | Clerk org roles: org:admin, org:member | Service uses API keys |
| JWT `tenantId` claim | Clerk organization ID | Each client = one Clerk org |
| `tenantId = FISCALEDGEV1` | Org slug: `fiscaledgev1` | System/admin tenant |
| `UserAccount.keycloakId` | `UserAccount.clerkUserId` | Clerk user ID |

### Middleware (src/middleware.ts)

The Clerk middleware runs on every request and:

1. **Public routes** — passes through without auth
   - `/`, `/sign-in`, `/sign-up`, `/api/fdms/public/*`, `/api/webhook/*`

2. **S2S routes** — passes through (auth handled in route handlers via API key)
   - `/api/s2s/*`

3. **Protected routes** — requires Clerk session
   - Redirects to `/sign-in` if unauthenticated

4. **Admin routes** — requires `org:admin` role
   - `/admin/*`

5. **Header injection** — adds auth context to request headers
   - `x-clerk-user-id`
   - `x-clerk-org-id`
   - `x-clerk-org-slug`
   - `x-clerk-org-role`

### Tenant Context Resolution (src/lib/tenant.ts)

```typescript
resolveTenantContext()
├── Extract Clerk auth (userId, orgId, orgRole, orgSlug)
├── Check if system org (slug = "fiscaledgev1" + role = org:admin)
│   └── YES → isSystemMode = true
├── If not system org:
│   └── Query clients table WHERE clerk_org_id = orgId
│       └── clientId = client.id (or null if not found)
└── Return: { userId, orgId, orgRole, orgSlug, clientId, isSystemMode, isTenantMode }

requireAdmin()
├── Calls resolveTenantContext()
└── Throws if !isSystemMode

requireTenant()
├── Calls resolveTenantContext()
└── Throws if !isTenantMode || !clientId
```

### User Provisioning (src/lib/tenant.ts → provisionUser)

On first tenant request, the user is auto-provisioned from Clerk session:
1. Query `user_accounts` by `clerk_user_id`
2. If exists → update email, fullName, username, lastLogin
3. If new → insert with status ACTIVE

### Webhook Handler (src/app/api/webhook/clerk/route.ts)

Handles Clerk webhook events:
- `user.created` / `user.updated` — sync user data
- `user.deleted` — soft-delete user account

Verifies webhook signature using `svix` library.

## Route Protection Summary

| Route | Auth Required | Role Required | Tenant Scoped |
|---|---|---|---|
| `/api/admin/*` | Clerk session | org:admin | System mode |
| `/api/tenant/*` | Clerk session | org:member | Tenant mode |
| `/api/s2s/*` | API key | service | No |
| `/api/fdms/*` | None | — | — |
| `/api/webhook/*` | Webhook signature | — | — |
| `/` | None | — | — |

## API Key Authentication (S2S)

Agents authenticate via API key in request header:
```
x-api-key: fedge_<64-hex-chars>
```

The key is SHA-256 hashed and compared against `agents.api_key_hash`.

## Files

| File | Purpose |
|---|---|
| `src/middleware.ts` | Clerk middleware with route protection |
| `src/lib/tenant.ts` | Tenant context, auth guards, user provisioning |
| `src/lib/api-response.ts` | Standardized API responses |
| `src/app/api/webhook/clerk/route.ts` | Clerk webhook handler |
