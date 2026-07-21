# Phase 8: Billing & Payments

**Status:** ⏳ Deferred

## Objective

Port the billing, invoicing, subscription, and payment systems from Spring Boot to Next.js.

**Note:** This phase was deferred to focus on the core fiscalisation features first.

## Scope

### From Spring Boot (Ported)

| Domain | Spring Boot Package | Key Entities |
|---|---|---|
| Subscriptions | `platform.subscription` | SubscriptionPlan, ClientSubscription |
| Billing/Invoices | `platform.billing.invoice` | Invoice, InvoiceSequence |
| Payments | `platform.billing.payment` | Payment |

### Planned for Next.js

| Feature | Description |
|---|---|
| Subscription Plans | CRUD for subscription tiers (Free, Basic, Pro, Enterprise) |
| Client Subscriptions | Assign plans to clients, track start/end dates |
| Invoice Generation | Auto-generate invoices on subscription events |
| Paynow Integration | Zimbabwean payment gateway (EcoCash, bank transfer) |
| Payment Polling | Async payment status checking |
| Subscription Extension | Auto-extend on successful payment |

## Proposed Schema

```typescript
// src/db/schema/subscription.ts

export const subscriptionPlans = pgTable("subscription_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  pricePerMonth: decimal("price_per_month", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  description: text("description"),
  durationInMonths: integer("duration_in_months").notNull(),
  maxAgents: integer("max_agents"),
  maxTransactions: integer("max_transactions"),
  featuresJson: text("features_json"),
  isDeleted: boolean("is_deleted").default(false),
  createdAt/updatedAt/createdBy/lastModifiedBy,
});

export const clientSubscriptions = pgTable("client_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").references(() => clients.id),
  planId: uuid("plan_id").references(() => subscriptionPlans.id),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  renewalDate: timestamp("renewal_date"),
  paymentStatus: text("payment_status", {
    enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
  }),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }),
  paymentReference: text("payment_reference"),
  status: text("status", {
    enum: ["ACTIVE", "SUSPENDED", "CANCELLED"],
  }),
  createdAt/updatedAt/createdBy/lastModifiedBy,
});

// src/db/schema/invoice.ts

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceNumber: text("invoice_number").unique().notNull(),
  clientId: uuid("client_id").references(() => clients.id),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  description: text("description"),
  status: text("status", {
    enum: ["ISSUED", "PAID", "CANCELLED"],
  }),
  paymentReference: text("payment_reference"),
  createdAt/updatedAt/createdBy/lastModifiedBy,
});

// src/db/schema/payment.ts

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  status: text("status", {
    enum: ["INITIATED", "PENDING", "SUCCESS", "FAILED", "REFUNDED"],
  }),
  provider: text("provider").default("PAYNOW"),
  method: text("method"),  // ECOCASH, BANK_TRANSFER, etc.
  providerReference: text("provider_reference"),
  createdAt/updatedAt,
});
```

## API Routes (Planned)

```
/api/admin/subscription-plans/
├── GET, POST                          # List / create plans
└── [planId]/
    ├── GET, PUT, PATCH, DELETE         # Plan CRUD

/api/subscriptions/
├── GET                                # List client subscriptions
├── POST                               # Create subscription
├── [subscriptionId]/
│   ├── GET                            # Get subscription
│   ├── PUT                            # Update subscription
│   └── PATCH                          # Cancel subscription

/api/billing/invoices/
├── GET                                # List invoices
└── [invoiceId]/
    └── GET                            # Get invoice

/api/billing/payments/
├── POST                               # Initiate payment
└── [paymentId]/
    └── GET                            # Poll payment status
```

## Paynow Integration

The Paynow SDK integration needs to be ported from Java to Node.js:

```typescript
// src/integration/paynow/index.ts

export async function initiatePayment(invoice: Invoice): Promise<PaymentResult> {
  // POST to Paynow API
  // Returns pollUrl + reference
}

export async function pollPaymentStatus(reference: string): Promise<PaymentStatus> {
  // GET from Paynow API
  // Returns status: paid | pending | cancelled
}
```

**Paynow API:** https://paynow.co.zw/api/v2

## Subscription Extension Logic

```typescript
// Ported from ClientSubscription.extendBy()
function extendSubscription(subscription: ClientSubscription, invoice: Invoice): void {
  if (invoice.status !== "PAID") {
    throw new Error("Cannot extend subscription with unpaid invoice");
  }

  const now = new Date();
  const newStart = now > subscription.endDate ? now : subscription.endDate;
  const newEnd = addMonths(newStart, invoice.plan.durationInMonths);

  subscription.startDate = newStart < subscription.startDate ? subscription.startDate : newStart;
  subscription.endDate = newEnd;
  subscription.status = "ACTIVE";
}
```
