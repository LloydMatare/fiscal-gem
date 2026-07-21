# Phase 9: Shared UI Components

**Status:** ⏳ Pending  
**Depends on:** Phases 1–4

## Objective

Create a reusable component library for the admin and tenant dashboards. Uses Tailwind CSS, consistent design tokens, and Clerk UI components where applicable.

## Tech Stack

| Library | Purpose |
|---|---|
| Tailwind CSS | Utility-first styling (already installed) |
| shadcn/ui | Pre-built accessible components (recommended) |
| @clerk/nextjs | Organization switcher, user button |
| lucide-react | Icon library |
| react-hook-form + zod | Form validation |

## Component Inventory

### Layout Components

| Component | File | Description |
|---|---|---|
| `AppShell` | `src/components/layout/app-shell.tsx` | Main layout wrapper (sidebar + header + content) |
| `Sidebar` | `src/components/layout/sidebar.tsx` | Collapsible sidebar navigation |
| `Header` | `src/components/layout/header.tsx` | Top bar with org switcher + user menu |
| `PageHeader` | `src/components/layout/page-header.tsx` | Page title + description + breadcrumbs |
| `PageContainer` | `src/components/layout/page-container.tsx` | Max-width content wrapper |

### Data Display Components

| Component | File | Description |
|---|---|---|
| `DataTable` | `src/components/data-table/data-table.tsx` | Generic sortable/filterable/paginated table |
| `DataTablePagination` | `src/components/data-table/pagination.tsx` | Page controls |
| `DataTableSearch` | `src/components/data-table/search.tsx` | Search input with debounce |
| `DataTableFilter` | `src/components/data-table/filter.tsx` | Column filter dropdowns |
| `StatCard` | `src/components/cards/stat-card.tsx` | Metric card (value + label + trend) |
| `EmptyState` | `src/components/empty-state.tsx` | Empty state illustration |
| `LoadingSpinner` | `src/components/loading-spinner.tsx` | Loading indicator |

### Form Components

| Component | File | Description |
|---|---|---|
| `Form` | `src/components/ui/form.tsx` | Wrapper for react-hook-form |
| `Input` | `src/components/ui/input.tsx` | Text input |
| `Select` | `src/components/ui/select.tsx` | Dropdown select |
| `Button` | `src/components/ui/button.tsx` | Button variants (primary, secondary, danger, ghost) |
| `Dialog` | `src/components/ui/dialog.tsx` | Modal dialog |
| `AlertDialog` | `src/components/ui/alert-dialog.tsx` | Confirmation dialog |
| `Toast` | `src/components/ui/toast.tsx` | Success/error notifications |
| `Badge` | `src/components/ui/badge.tsx` | Status badges |

### Status Components

| Component | File | Description |
|---|---|---|
| `StatusBadge` | `src/components/status-badge.tsx` | Colored status pill (ACTIVE=green, INACTIVE=gray, etc.) |
| `ReceiptStatusBadge` | `src/components/receipt-status-badge.tsx` | Receipt lifecycle status |
| `AgentStatusIndicator` | `src/components/agent-status.tsx` | Online/offline dot + last seen |

## Directory Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── app-shell.tsx
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── page-header.tsx
│   │   └── page-container.tsx
│   ├── data-table/
│   │   ├── data-table.tsx
│   │   ├── pagination.tsx
│   │   ├── search.tsx
│   │   └── filter.tsx
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── dialog.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── toast.tsx
│   │   └── badge.tsx
│   ├── cards/
│   │   └── stat-card.tsx
│   ├── status-badge.tsx
│   ├── receipt-status-badge.tsx
│   ├── agent-status.tsx
│   ├── empty-state.tsx
│   └── loading-spinner.tsx
├── hooks/
│   ├── use-pagination.ts
│   ├── use-search.ts
│   └── use-toast.ts
└── lib/
    ├── utils.ts           # cn() class merge helper
    └── constants.ts       # Status colors, labels
```

## Design Tokens

### Status Colors

| Status | Color | Usage |
|---|---|---|
| ACTIVE | Green (`bg-emerald-500`) | Active client, agent online |
| INACTIVE | Gray (`bg-gray-400`) | Inactive client |
| SUSPENDED | Yellow (`bg-amber-500`) | Suspended client/agent |
| DELETED | Red (`bg-red-500`) | Soft-deleted records |
| RECEIVED | Blue (`bg-blue-500`) | Receipt received |
| SIGNED | Indigo (`bg-indigo-500`) | Receipt signed |
| SENT | Purple (`bg-purple-500`) | Receipt sent to ZIMRA |
| ACCEPTED | Green (`bg-emerald-500`) | Receipt accepted |
| FISCALISED | Green (`bg-emerald-600`) | Receipt fiscalised |
| FAILED | Red (`bg-red-500`) | Receipt/agent failed |
| OPENED | Green (`bg-emerald-500`) | Fiscal day open |
| CLOSED | Gray (`bg-gray-500`) | Fiscal day closed |

### Button Variants

| Variant | Style | Usage |
|---|---|---|
| primary | Blue background, white text | Submit forms, primary actions |
| secondary | Gray background | Secondary actions |
| danger | Red background | Delete, destructive actions |
| ghost | Transparent | Cancel, tertiary actions |
| outline | Bordered | Toggle actions |

## Reusable Patterns

### CRUD Page Pattern

Each entity (clients, shops, agents, devices) follows the same pattern:

```tsx
// src/app/admin/clients/page.tsx
export default function ClientsPage() {
  return (
    <AppShell>
      <PageHeader
        title="Clients"
        description="Manage tenant organizations"
        action={<CreateClientDialog />}
      />
      <DataTable
        columns={clientColumns}
        fetchUrl="/api/admin/clients"
        searchable
        filterable
      />
    </AppShell>
  );
}
```

### Detail Page Pattern

```tsx
// src/app/admin/clients/[clientId]/page.tsx
export default async function ClientDetailPage({ params }) {
  const client = await fetchClient(params.clientId);

  return (
    <AppShell>
      <PageHeader
        title={client.name}
        description={client.tenantCode}
        breadcrumbs={[{ label: "Clients", href: "/admin/clients" }]}
        action={<EditClientDialog client={client} />}
      />
      <Tabs>
        <TabsList>
          <TabsTrigger>Overview</TabsTrigger>
          <TabsTrigger>Shops</TabsTrigger>
          <TabsTrigger>Devices</TabsTrigger>
          <TabsTrigger>Receipts</TabsTrigger>
        </TabsList>
        <TabsContent><ClientOverview client={client} /></TabsContent>
        <TabsContent><ClientShops clientId={client.id} /></TabsContent>
        <TabsContent><ClientDevices clientId={client.id} /></TabsContent>
        <TabsContent><ClientReceipts clientId={client.id} /></TabsContent>
      </Tabs>
    </AppShell>
  );
}
```
