# Phase 11: Tenant Frontend

**Status:** ⏳ Pending  
**Depends on:** Phase 9 (shared components), Phase 4 (API routes)

## Objective

Build the tenant self-service dashboard for businesses to manage their shops, view agents, and track receipts. Tenant users are scoped to their Clerk organization and can only see their own data.

## Route Map

```
/(tenant)/
├── (dashboard)/
│   └── page.tsx                     # Tenant dashboard with overview
├── profile/
│   └── page.tsx                     # Business profile management
├── shops/
│   ├── page.tsx                     # Shops list
│   └── [shopId]/
│       └── page.tsx                 # Shop detail + agents
├── devices/
│   ├── page.tsx                     # Devices list (read-only, admin-registered)
│   └── [deviceId]/
│       └── page.tsx                 # Device detail + fiscal days
├── receipts/
│   ├── page.tsx                     # All receipts list
│   └── [receiptId]/
│       └── page.tsx                 # Receipt detail
└── settings/
    └── page.tsx                     # Tenant settings (future)
```

## Page Specifications

### 1. Tenant Dashboard (`/`)

**Purpose:** Overview of the tenant's fiscalisation status.

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Sidebar  │  Dashboard                              │
│           │                                         │
│  Profile  │  Welcome back, Acme Corp                │
│  Shops    │                                         │
│  Devices  │  ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  Receipts │  │  Shops   │ │ Devices  │ │Agents  │  │
│  Settings │  │    3     │ │    5     │ │   8    │  │
│           │  └──────────┘ └──────────┘ └────────┘  │
│           │                                         │
│           │  ┌──────────┐ ┌──────────┐ ┌────────┐  │
│           │  │ Receipts │ │ Today    │ │ Failed │  │
│           │  │  456     │ │   23     │ │    0   │  │
│           │  └──────────┘ └──────────┘ └────────┘  │
│           │                                         │
│           │  Recent Receipts                        │
│           │  ┌───────────────────────────────────┐  │
│           │  │ # | Status | Amount | Time        │  │
│           │  │ 1 | ✓      | $15.00 | 10:30 AM   │  │
│           │  │ 2 | ✓      | $22.50 | 10:28 AM   │  │
│           │  └───────────────────────────────────┘  │
│           │                                         │
│           │  Agent Status                           │
│           │  ┌───────────────────────────────────┐  │
│           │  │ Shop A - Agent 1  ● Online        │  │
│           │  │ Shop A - Agent 2  ○ Offline (2h)  │  │
│           │  │ Shop B - Agent 3  ● Online        │  │
│           │  └───────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 2. Profile (`/profile`)

**Purpose:** View and update business information.

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Business Profile                           │
├─────────────────────────────────────────────┤
│                                             │
│  Company Information                        │
│  ┌─────────────────────────────────────┐    │
│  │  Name:              Acme Corp       │    │
│  │  Tenant Code:       FEDGEACMEX     │    │
│  │  Tax ID:            12345678        │    │
│  │  Registration:      REG-001         │    │
│  │  Line of Business:  Retail          │    │
│  │  Currency:          USD             │    │
│  │  Time Zone:         Africa/Harare   │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [Edit Profile]                             │
│                                             │
│  Addresses                                  │
│  ┌─────────────────────────────────────┐    │
│  │  123 Main St, Harare, Zimbabwe      │    │
│  └─────────────────────────────────────┘    │
│  + Add Address                              │
│                                             │
│  Contacts                                   │
│  ┌─────────────────────────────────────┐    │
│  │  John Doe | john@acme.com | +263... │    │
│  └─────────────────────────────────────┘    │
│  + Add Contact                              │
│                                             │
└─────────────────────────────────────────────┘
```

### 3. Shops List (`/shops`)

**Purpose:** Manage business locations.

**Columns:**
| Column | Field | Sortable |
|---|---|---|
| Name | `name` | Yes |
| City | `city` | Yes |
| Address | `address` | No |
| Contact Person | `contactPerson` | No |
| Agents | count | No |
| Created | `createdAt` | Yes |

**Actions:**
- Click row → shop detail
- "Add Shop" button → create dialog

**Create Shop Dialog:**
```
┌─────────────────────────────────┐
│  Add Shop                       │
├─────────────────────────────────┤
│  Name *           [__________]  │
│  City             [__________]  │
│  Address          [__________]  │
│  Contact Person   [__________]  │
│  Contact Phone    [__________]  │
│                                 │
│           [Cancel] [Create]     │
└─────────────────────────────────┘
```

### 4. Shop Detail (`/shops/[shopId]`)

**Purpose:** View shop info and its agents.

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Shop A                        [Edit]       │
│  123 Main St, Harare                         │
├─────────────────────────────────────────────┤
│                                             │
│  Tabs: [Overview] [Agents]                  │
│                                             │
│  ── Agents Tab ──                           │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ Agent #  | Machine | Status | Last  │    │
│  │ AGT001   | POS-1   │ ● Online | now │    │
│  │ AGT002   | POS-2   │ ○ Offline| 2h  │    │
│  │ AGT003   | BO-1    │ ● Online | now │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Agent Detail (click row):                  │
│  ┌─────────────────────────────────────┐    │
│  │ Machine:      POS-1                │    │
│  │ Status:       ACTIVE ●             │    │
│  │ Online:       Yes                  │    │
│  │ Version:      2.1.0                │    │
│  │ OS:           Windows 11           │    │
│  │ Last Seen:    2026-07-21 10:30:00  │    │
│  │ IP:           192.168.1.100        │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

### 5. Devices List (`/devices`)

**Purpose:** View registered fiscal devices (read-only for tenants).

**Columns:**
| Column | Field | Sortable |
|---|---|---|
| Device ID | `deviceId` | Yes |
| Serial | `serialNumber` | Yes |
| Model | `deviceModelName` | Yes |
| Status | `activated` | No |
| Active Fiscal Day | `fiscalDayNo` | No |
| Last Receipt | timestamp | Yes |

**Note:** Devices are registered by admins. Tenants can view and trigger day operations.

### 6. Device Detail (`/devices/[deviceId]`)

**Purpose:** Device status and fiscal day management.

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Device: ZIMRA-10045           [Active ●]   │
│  Serial: SN001  |  Model: SAM4s  |  v1.0   │
├─────────────────────────────────────────────┤
│                                             │
│  Fiscal Day Status                          │
│  ┌─────────────────────────────────────┐    │
│  │  Current Day: #12                   │    │
│  │  Status:      OPENED ●             │    │
│  │  Receipts:    45                    │    │
│  │  Opened:      2026-07-21 08:00     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Day Operations                             │
│  ┌─────────────────────────────────────┐    │
│  │  [Open Day]  [Close Day]  [Status]  │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Fiscal Day History                         │
│  ┌─────────────────────────────────────┐    │
│  │ Day #  | Status  | Receipts | Date  │    │
│  │ 12     | OPENED  | 45       | Today │    │
│  │ 11     | CLOSED  | 89       | Yest  │    │
│  │ 10     | CLOSED  | 76       | Jul 19│    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Recent Receipts for this Device             │
│  (DataTable)                                │
│                                             │
└─────────────────────────────────────────────┘
```

### 7. Receipts List (`/receipts`)

**Purpose:** View all receipts across all devices and shops.

**Columns:**
| Column | Field | Sortable | Filterable |
|---|---|---|---|
| Receipt # | `receiptGlobalNo` | Yes | No |
| External Ref | `externalReference` | No | No |
| Shop | `shop.name` | Yes | Yes |
| Device | `device.deviceId` | Yes | Yes |
| Status | `status` | Yes | Yes |
| Amount | `totalAmount` | Yes | No |
| Received At | `receivedAt` | Yes | No |

**Filters:**
- Status (multi-select)
- Date range
- Shop
- Device

### 8. Receipt Detail (`/receipts/[receiptId]`)

Same layout as admin receipt detail, but without admin-only actions.

## Navigation Structure

```
Sidebar:
├── 📊 Dashboard         → /
├── 👤 Profile           → /profile
├── 🏪 Shops             → /shops
├── 📱 Devices           → /devices
├── 🧾 Receipts          → /receipts
└── ⚙️ Settings          → /settings (future)
```

## Data Fetching Strategy

| Approach | Usage |
|---|---|
| Server Components | Initial page loads with auth context |
| Client fetch (SWR) | Polling agent status, receipt updates |
| Form actions | Create/update shops, profile |
| Server Actions | Device day operations (open/close) |

## Differences from Admin

| Feature | Admin | Tenant |
|---|---|---|
| Scope | All clients | Own client only |
| Client management | Full CRUD | View-only profile |
| Shop management | Full CRUD | Create + edit own shops |
| Device registration | ✅ Register devices | ❌ View-only |
| Agent creation | ✅ Create agents | ❌ View-only |
| Receipt detail | Full payload + ZIMRA response | Receipt summary |
| Fiscal day ops | All devices | Own devices |
| Settings | Platform settings | Tenant settings |
