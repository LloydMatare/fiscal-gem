# Phase 10: Admin Frontend

**Status:** ⏳ Pending  
**Depends on:** Phase 9 (shared components), Phase 4 (API routes)

## Objective

Build the platform administrator dashboard for managing all tenants, their shops, devices, agents, and receipts. Admins operate in "system mode" via the `fiscaledgev1` Clerk organization.

## Route Map

```
/admin/
├── (dashboard)/
│   └── page.tsx                     # Overview dashboard with stats
├── clients/
│   ├── page.tsx                     # Client list (DataTable)
│   └── [clientId]/
│       ├── page.tsx                 # Client detail (tabs: overview, shops, devices, receipts)
│       ├── shops/
│       │   ├── page.tsx             # Client's shops list
│       │   └── [shopId]/
│       │       └── page.tsx         # Shop detail (tabs: overview, agents)
│       │           └── agents/
│       │               └── [agentId]/
│       │                   └── page.tsx  # Agent detail
│       ├── devices/
│       │   ├── page.tsx             # Client's devices list
│       │   └── [deviceId]/
│       │       └── page.tsx         # Device detail + actions
│       └── receipts/
│           ├── page.tsx             # Client's receipts list
│           └── [receiptId]/
│               └── page.tsx         # Receipt detail
├── settings/
│   └── page.tsx                     # Platform settings (future)
```

## Page Specifications

### 1. Admin Dashboard (`/admin/`)

**Purpose:** Platform-wide overview metrics.

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Sidebar  │  Admin Dashboard                        │
│           │                                         │
│  Clients  │  ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  Shops    │  │ Clients  │ │ Devices  │ │ Agents │  │
│  Devices  │  │   12     │ │   45     │ │   78   │  │
│  Agents   │  └──────────┘ └──────────┘ └────────┘  │
│  Receipts │                                         │
│  Settings │  ┌──────────┐ ┌──────────┐ ┌────────┐  │
│           │  │ Receipts │ │  Active  │ │ Failed │  │
│           │  │  1,234   │ │   120    │ │    3   │  │
│           │  └──────────┘ └──────────┘ └────────┘  │
│           │                                         │
│           │  Recent Receipts                        │
│           │  ┌───────────────────────────────────┐  │
│           │  │ Client | Device | Status | Date   │  │
│           │  │ ...    | ...    | ...    | ...    │  │
│           │  └───────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Stats to fetch:**
- Total clients (active / suspended)
- Total devices
- Total agents (online / offline)
- Total receipts (today / this month)
- Failed receipts (needs attention)

**API calls:**
- `GET /api/admin/clients?limit=5` (for count)
- Future: dedicated stats endpoint

### 2. Clients List (`/admin/clients`)

**Purpose:** Paginated, searchable list of all tenant organizations.

**Columns:**
| Column | Field | Sortable | Filterable |
|---|---|---|---|
| Name | `name` | Yes | No |
| Tenant Code | `tenantCode` | Yes | No |
| Status | `status` | Yes | Yes |
| Currency | `currency` | No | Yes |
| Shops | count | No | No |
| Created | `createdAt` | Yes | No |

**Actions:**
- Search by name / tenant code
- Filter by status
- Click row → navigate to client detail
- "Create Client" button → dialog

**Create Client Dialog:**
```
┌─────────────────────────────────┐
│  Create Client                  │
├─────────────────────────────────┤
│  Name *          [__________]   │
│  Tax ID          [__________]   │
│  Reg Number      [__________]   │
│  Line of Business[__________]   │
│  Currency        [USD       ▼]  │
│  Time Zone       [Africa/H ▼]   │
│                                 │
│           [Cancel] [Create]     │
└─────────────────────────────────┘
```

### 3. Client Detail (`/admin/clients/[clientId]`)

**Purpose:** Full client management with tabbed sub-views.

**Header:**
- Client name + status badge
- Tenant code (copyable)
- Edit button
- Soft delete / restore button

**Tabs:**

#### Tab: Overview
```
Client Information
┌─────────────────────────────────┐
│  Name:              Acme Corp   │
│  Tenant Code:       FEDGEACMEX │
│  Tax ID:            12345678    │
│  Registration:      REG-001     │
│  Status:            ACTIVE ●    │
│  Currency:          USD         │
│  Time Zone:         Africa/Harare│
│  ZIMRA Device ID:   10045       │
│  Notes:             ...         │
└─────────────────────────────────┘
```

#### Tab: Shops
- DataTable of shops for this client
- Create shop dialog
- Click row → shop detail

#### Tab: Devices
- DataTable of devices for this client
- Register device button (generates CSR)
- Device actions: get config, get status, open day, close day, ping
- Device certificate info

#### Tab: Receipts
- DataTable of receipts for this client
- Filter by status
- Click row → receipt detail

### 4. Shop Detail (`/admin/clients/[clientId]/shops/[shopId]`)

**Header:** Shop name + client link + status

**Tabs:**

#### Tab: Overview
- Shop info (name, city, address, contact)
- Edit dialog

#### Tab: Agents
- DataTable of agents for this shop
- Create agent dialog (shows API key once on creation)
- Agent actions: ping, view config

### 5. Device Detail (`/admin/clients/[clientId]/devices/[deviceId]`)

**Purpose:** Device management with ZIMRA integration actions.

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Device: ZIMRA-10045-SN001       [ACTIVE ●] │
│  Serial: SN001  |  Model: SAM4s  |  v1.0   │
├─────────────────────────────────────────────┤
│                                             │
│  Quick Actions                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│  │ Ping │ │Config│ │Status│ │Cert  │      │
│  └──────┘ └──────┘ └──────┘ └──────┘      │
│                                             │
│  Certificate Info                           │
│  ┌─────────────────────────────────────┐    │
│  │ Common Name: ZIMRA-10045-SN001     │    │
│  │ Activated:   Yes                   │    │
│  │ CSR:         [View] [Regenerate]   │    │
│  │ Certificate: [View]                │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Fiscal Days                                │
│  ┌─────────────────────────────────────┐    │
│  │ Day #1  OPENED  |  100 receipts    │    │
│  │ Day #2  CLOSED  |  85 receipts     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Recent Receipts                            │
│  (DataTable with last 10)                   │
│                                             │
└─────────────────────────────────────────────┘
```

**Device Actions (buttons):**
| Action | API Call | Description |
|---|---|---|
| Ping | `POST /s2s/fiscal-day` | Check device connectivity |
| Get Config | `POST /s2s/fiscal-day` | Fetch device configuration |
| Get Status | `POST /s2s/fiscal-day` | Current fiscal day status |
| Open Day | `POST /s2s/fiscal-day` | Start a new fiscal day |
| Close Day | `POST /s2s/fiscal-day` | Close current fiscal day |

### 6. Receipt Detail (`/admin/clients/[clientId]/receipts/[receiptId]`)

**Purpose:** Full receipt lifecycle view.

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Receipt #1  |  EXTERNAL-001  |  ACCEPTED ● │
├─────────────────────────────────────────────┤
│                                             │
│  Timeline                                   │
│  ● Received    2026-07-21 10:30:00         │
│  ● Signed      2026-07-21 10:30:01         │
│  ● Sent        2026-07-21 10:30:02         │
│  ● Fiscalised  2026-07-21 10:30:05         │
│                                             │
│  Receipt Data                               │
│  ┌─────────────────────────────────────┐    │
│  │ Fiscal Day:     1                   │    │
│  │ Global No:      1                   │    │
│  │ Receipt Type:   STANDARD            │    │
│  │ Invoice No:     INV-001             │    │
│  │ Client:         Acme Corp           │    │
│  │ Device:         ZIMRA-10045         │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Payload (JSON)                             │
│  ┌─────────────────────────────────────┐    │
│  │ { ... formatted JSON ... }          │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ZIMRA Response                             │
│  ┌─────────────────────────────────────┐    │
│  │ { ... response JSON ... }           │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Server Signature                           │
│  ┌─────────────────────────────────────┐    │
│  │ Hash:     abc123...                 │    │
│  │ Verified: Yes ✓                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

## Component Usage

### Admin Pages → Components Mapping

| Page | AppShell | DataTable | Dialogs | Status |
|---|---|---|---|---|
| Dashboard | ✅ | — | — | StatCard |
| Clients List | ✅ | ✅ | CreateClient | StatusBadge |
| Client Detail | ✅ | ✅ (shops, devices, receipts) | EditClient | StatusBadge |
| Shop Detail | ✅ | ✅ (agents) | EditShop | StatusBadge |
| Device Detail | ✅ | ✅ (receipts) | — | AgentStatusIndicator |
| Receipt Detail | ✅ | — | — | ReceiptStatusBadge |

## Data Fetching Strategy

| Approach | Usage |
|---|---|
| Server Components | Initial page data (list pages, detail pages) |
| Client fetch (SWR/React Query) | Polling (agent heartbeat, receipt status) |
| Form actions | Create/update/delete mutations |
| Optimistic updates | Status changes, soft deletes |

## Navigation Structure

```
Sidebar:
├── 📊 Dashboard          → /admin
├── 👥 Clients            → /admin/clients
├── 🏪 Shops              → /admin/clients/[id]/shops
├── 📱 Devices            → /admin/clients/[id]/devices
├── 🧾 Receipts           → /admin/clients/[id]/receipts
└── ⚙️ Settings           → /admin/settings (future)
```
