import {
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  pgTable,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { clients } from "./client";

export const shops = pgTable(
  "shops",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    city: text("city"),
    address: text("address"),
    contactPerson: text("contact_person"),
    contactPhone: text("contact_phone"),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    deleted: boolean("deleted").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    createdBy: text("created_by").default("system").notNull(),
    lastModifiedBy: text("last_modified_by"),
  },
  (table) => [
    index("idx_shop_client_id").on(table.clientId),
  ]
);

export const shopDatabaseConfigs = pgTable(
  "shop_database_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" })
      .unique(),
    dbEngine: text("db_engine"),
    host: text("host"),
    port: integer("port"),
    databaseName: text("database_name"),
    username: text("username"),
    passwordEncrypted: text("password_encrypted"),
    sslEnabled: boolean("ssl_enabled").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  }
);
