import {
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  pgTable,
  uniqueIndex,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { clients } from "./client";
import { devices } from "./device";
import { shops } from "./shop";
import { fiscalDays } from "./fiscal-day";

export const receipts = pgTable(
  "fiscal_receipts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    shopId: uuid("shop_id").references(() => shops.id, {
      onDelete: "set null",
    }),
    fiscalDayId: uuid("fiscal_day_id").references(() => fiscalDays.id, {
      onDelete: "set null",
    }),
    fiscalDayNo: integer("fiscal_day_no"),
    receiptGlobalNo: integer("receipt_global_no"),
    receiptCounter: integer("receipt_counter"),
    receiptType: text("receipt_type"),
    invoiceNo: text("invoice_no"),
    externalReference: text("external_reference").notNull(),
    receiptNumber: text("receipt_number"),
    originalPayloadJson: text("original_payload_json").notNull(),
    fiscalPayloadJson: text("fiscal_payload_json").notNull(),
    signedPayloadJson: text("signed_payload_json"),
    fdmsResponseJson: text("fdms_response_json"),
    fdmsOperationId: text("fdms_operation_id"),
    fdmsReceiptId: integer("fdms_receipt_id"),
    fdmsServerDate: timestamp("fdms_server_date", { withTimezone: true }),
    fdmsServerSignatureHash: text("fdms_server_signature_hash"),
    fdmsServerSignature: text("fdms_server_signature"),
    fdmsServerSignatureThumbprint: text("fdms_server_signature_thumbprint"),
    fdmsServerSignatureVerified: boolean("fdms_server_signature_verified"),
    fdmsServerSignatureVerificationError: text(
      "fdms_server_signature_verification_error"
    ),
    fdmsValidationErrorsJson: text("fdms_validation_errors_json"),
    status: text("status", {
      enum: [
        "RECEIVED",
        "VALIDATED",
        "SIGNED",
        "QUEUED",
        "PROCESSING",
        "SENT",
        "ACCEPTED",
        "FDMS_ACCEPTED_WITH_VALIDATION_ERRORS",
        "FISCALISED",
        "FAILED",
        "RETRY_PENDING",
        "CANCELLED",
      ],
    })
      .notNull()
      .default("RECEIVED"),
    retryCount: integer("retry_count").default(0).notNull(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    receivedAt: timestamp("received_at").notNull(),
    processedAt: timestamp("processed_at"),
    signedAt: timestamp("signed_at"),
    sentAt: timestamp("sent_at"),
    fiscalisedAt: timestamp("fiscalised_at"),
    lastRetryAt: timestamp("last_retry_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    createdBy: text("created_by").default("system").notNull(),
    lastModifiedBy: text("last_modified_by"),
  },
  (table) => [
    uniqueIndex("uk_receipt_client_external_reference").on(
      table.clientId,
      table.externalReference
    ),
    index("idx_receipt_client_id").on(table.clientId),
    index("idx_receipt_client_status").on(table.clientId, table.status),
    index("idx_receipt_client_device_fiscal_day").on(
      table.clientId,
      table.deviceId,
      table.fiscalDayNo
    ),
    index("idx_receipt_status_received_at").on(
      table.status,
      table.receivedAt
    ),
  ]
);
