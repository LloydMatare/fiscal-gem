import {
  uuid,
  text,
  timestamp,
  boolean,
  pgTable,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { shops } from "./shop";
import { devices } from "./device";

export const agents = pgTable(
  "agents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    machineId: text("machine_id"),
    apiKeyHash: text("api_key_hash"),
    status: text("status", {
      enum: ["ACTIVE", "INACTIVE", "SUSPENDED", "DELETED"],
    }),
    online: boolean("online"),
    lastSeen: timestamp("last_seen"),
    lastIpAddress: text("last_ip_address"),
    agentVersion: text("agent_version"),
    os: text("os"),
    osVersion: text("os_version"),
    deviceName: text("device_name"),
    type: text("type", { enum: ["POS", "BACK_OFFICE", "MOBILE", "KIOSK"] }),
    installedAt: timestamp("installed_at"),
    deleted: boolean("deleted").default(false).notNull(),
    agentNumber: text("agent_number").unique().notNull(),
    publicKey: text("public_key"),
    deviceId: uuid("device_id").references(() => devices.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    createdBy: text("created_by").default("system").notNull(),
    lastModifiedBy: text("last_modified_by"),
  },
  (table) => [
    index("idx_agent_shop_id").on(table.shopId),
    index("idx_agent_device_id").on(table.deviceId),
  ]
);
