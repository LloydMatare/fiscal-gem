import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const deviceStatus = pgEnum("device_status", [
  "draft",
  "registered",
  "active",
  "expired",
  "revoked",
]);

export const deviceMode = pgEnum("device_mode", ["online", "offline"]);

export const fiscalDayStatus = pgEnum("fiscal_day_status", [
  "open",
  "closing",
  "closed",
]);

export const receiptStatus = pgEnum("receipt_status", [
  "draft",
  "pending",
  "submitted",
  "accepted",
  "rejected",
]);

export const fileStatus = pgEnum("file_status", [
  "pending",
  "submitted",
  "processing",
  "completed",
  "failed",
]);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkOrgId: varchar("clerk_org_id", { length: 191 }).notNull(),
    name: varchar("name", { length: 256 }).notNull(),
    primaryTin: varchar("primary_tin", { length: 20 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    clerkOrgIdIdx: uniqueIndex("organizations_clerk_org_id_idx").on(
      table.clerkOrgId,
    ),
  }),
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clerkUserId: varchar("clerk_user_id", { length: 191 }).notNull(),
    role: varchar("role", { length: 64 }).notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgUserIdx: uniqueIndex("memberships_org_user_idx").on(
      table.organizationId,
      table.clerkUserId,
    ),
  }),
);

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    deviceId: integer("device_id"),
    serialNumber: varchar("serial_number", { length: 64 }),
    activationKey: varchar("activation_key", { length: 32 }),
    privateKey: text("private_key"),
    mode: deviceMode("mode").notNull().default("online"),
    branchName: varchar("branch_name", { length: 256 }),
    branchAddress: jsonb("branch_address"),
    branchContacts: jsonb("branch_contacts"),
    status: deviceStatus("status").notNull().default("draft"),
    certificatePem: text("certificate_pem"),
    certificateIssuedAt: timestamp("certificate_issued_at", {
      withTimezone: true,
    }),
    certificateExpiresAt: timestamp("certificate_expires_at", {
      withTimezone: true,
    }),
    fdmsOperationId: varchar("fdms_operation_id", { length: 64 }),
    lastReceiptHash: varchar("last_receipt_hash", { length: 64 }),
    taxRates: jsonb("tax_rates"),
    taxPayerDetails: jsonb("tax_payer_details"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgDeviceIdx: index("devices_org_idx").on(table.organizationId),
    deviceIdIdx: index("devices_device_id_idx").on(table.deviceId),
  }),
);

export const fiscalDays = pgTable(
  "fiscal_days",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    fdmsDayNo: integer("fdms_day_no"),
    status: fiscalDayStatus("status").notNull().default("open"),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    summary: jsonb("summary"),
    fdmsOperationId: varchar("fdms_operation_id", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    deviceDayIdx: index("fiscal_days_device_idx").on(table.deviceId),
  }),
);

export const receipts = pgTable(
  "receipts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    fiscalDayId: uuid("fiscal_day_id").references(() => fiscalDays.id, {
      onDelete: "set null",
    }),
    receiptNo: varchar("receipt_no", { length: 64 }),
    currency: varchar("currency", { length: 16 }).default("ZWL"),
    total: integer("total"),
    status: receiptStatus("status").notNull().default("draft"),
    payload: jsonb("payload").notNull(),
    previousReceiptHash: varchar("previous_receipt_hash", { length: 64 }),
    fdmsOperationId: varchar("fdms_operation_id", { length: 64 }),
    fdmsReceiptUrl: text("fdms_receipt_url"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    receiptDeviceIdx: index("receipts_device_idx").on(table.deviceId),
  }),
);

export const files = pgTable(
  "files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 64 }).notNull(),
    status: fileStatus("status").notNull().default("pending"),
    fileName: varchar("file_name", { length: 255 }),
    payload: jsonb("payload"),
    fdmsOperationId: varchar("fdms_operation_id", { length: 64 }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    fileDeviceIdx: index("files_device_idx").on(table.deviceId),
  }),
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    actorId: varchar("actor_id", { length: 191 }),
    action: varchar("action", { length: 128 }).notNull(),
    entityType: varchar("entity_type", { length: 64 }),
    entityId: varchar("entity_id", { length: 128 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    actionIdx: index("audit_logs_action_idx").on(table.action),
  }),
);
