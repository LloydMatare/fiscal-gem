import {
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  pgTable,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    taxId: text("tax_id"),
    registrationNumber: text("registration_number"),
    lineOfBusiness: text("line_of_business"),
    industryCode: text("industry_code"),
    licenseNumber: text("license_number"),
    internalReferenceCode: text("internal_reference_code"),
    status: text("status", {
      enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
    })
      .notNull()
      .default("ACTIVE"),
    currency: text("currency"),
    timeZone: text("time_zone"),
    notes: text("notes"),
    zimraDeviceId: integer("zimra_device_id"),
    tenantCode: text("tenant_code"),
    deleted: boolean("deleted").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    createdBy: text("created_by").default("system").notNull(),
    lastModifiedBy: text("last_modified_by"),
    // Clerk org mapping
    clerkOrgId: text("clerk_org_id").unique(),
  },
  (table) => [
    uniqueIndex("uk_client_tenant_code").on(table.tenantCode),
    uniqueIndex("uk_client_clerk_org").on(table.clerkOrgId),
    index("idx_client_status").on(table.status),
  ]
);
