import {
  uuid,
  text,
  timestamp,
  boolean,
  pgTable,
  index,
} from "drizzle-orm/pg-core";
import { clients } from "./client";

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tradeName: text("trade_name"),
    tin: text("tin"),
    vatNumber: text("vat_number"),
    phone: text("phone"),
    email: text("email"),
    province: text("province"),
    city: text("city"),
    street: text("street"),
    houseNo: text("house_no"),
    district: text("district"),
    notes: text("notes"),
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
    index("idx_customer_client_id").on(table.clientId),
  ]
);
