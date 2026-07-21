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

export const fiscalDays = pgTable(
  "fiscal_days",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    fiscalDayNo: integer("fiscal_day_no").notNull(),
    fiscalDayOpened: timestamp("fiscal_day_opened").notNull(),
    fiscalDayClosed: timestamp("fiscal_day_closed"),
    status: text("status", {
      enum: [
        "OPENED",
        "CLOSE_INITIATED",
        "CLOSED",
        "CLOSE_FAILED",
        "OPEN_INITIATED",
        "OPEN_FAILED",
      ],
    })
      .notNull()
      .default("OPENED"),
    openOperationId: text("open_operation_id"),
    closeOperationId: text("close_operation_id"),
    reconciliationMode: text("reconciliation_mode", {
      enum: ["STANDARD", "ADVANCED"],
    }),
    closingErrorCode: text("closing_error_code"),
    receiptCounter: integer("receipt_counter").default(0),
    lastReceiptGlobalNo: integer("last_receipt_global_no").default(0),
    fiscalDayCountersJson: text("fiscal_day_counters_json"),
    fiscalDayDocumentQuantitiesJson: text(
      "fiscal_day_document_quantities_json"
    ),
    fiscalDayDeviceSignatureHash: text("fiscal_day_device_signature_hash"),
    fiscalDayDeviceSignature: text("fiscal_day_device_signature"),
    fiscalDayServerSignatureHash: text("fiscal_day_server_signature_hash"),
    fiscalDayServerSignature: text("fiscal_day_server_signature"),
    fiscalDayServerSignatureThumbprint: text(
      "fiscal_day_server_signature_thumbprint"
    ),
    fiscalDayServerSignatureVerified: boolean(
      "fiscal_day_server_signature_verified"
    ),
    fiscalDayServerSignatureVerificationError: text(
      "fiscal_day_server_signature_verification_error"
    ),
    fdmsOpenResponseJson: text("fdms_open_response_json"),
    fdmsCloseResponseJson: text("fdms_close_response_json"),
    fdmsStatusResponseJson: text("fdms_status_response_json"),
    submitFileOperationId: text("submit_file_operation_id"),
    submitFileSequence: integer("submit_file_sequence"),
    fdmsSubmitFileResponseJson: text("fdms_submit_file_response_json"),
    submitFileSource: text("submit_file_source"),
    submitFileStatus: text("submit_file_status"),
    submitFileSubmittedAt: timestamp("submit_file_submitted_at", {
      withTimezone: true,
    }),
    submitFileBase64Size: integer("submit_file_base64_size"),
    submitFileDecodedJsonSize: integer("submit_file_decoded_json_size"),
    submitFileChecksumSha256: text("submit_file_checksum_sha256"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    createdBy: text("created_by").default("system").notNull(),
    lastModifiedBy: text("last_modified_by"),
  },
  (table) => [
    uniqueIndex("uk_fiscal_day_client_device_no").on(
      table.clientId,
      table.deviceId,
      table.fiscalDayNo
    ),
    index("idx_fiscal_day_client_device_status").on(
      table.clientId,
      table.deviceId,
      table.status
    ),
  ]
);
