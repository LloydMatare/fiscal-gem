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

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deviceId: integer("device_id"),
    serialNumber: text("serial_number"),
    deviceModelName: text("device_model_name"),
    deviceModelVersion: text("device_model_version"),
    activationKey: text("activation_key"),
    csr: text("csr"),
    certificate: text("certificate"),
    registrationResponseJson: text("registration_response_json"),
    keyMaterialUrls: text("key_material_urls"),
    commonName: text("common_name"),
    activated: boolean("activated").default(false),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    createdBy: text("created_by").default("system").notNull(),
    lastModifiedBy: text("last_modified_by"),
  },
  (table) => [
    uniqueIndex("uk_device_client_device_code").on(
      table.clientId,
      table.deviceId
    ),
    index("idx_device_client_id").on(table.clientId),
  ]
);
