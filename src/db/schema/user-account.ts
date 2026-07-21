import {
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  pgTable,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { clients } from "./client";

export const userAccounts = pgTable(
  "user_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: text("clerk_user_id").notNull().unique(),
    username: text("username").notNull().unique(),
    email: text("email").unique(),
    fullName: text("full_name").notNull(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["ACTIVE", "INACTIVE", "SUSPENDED", "DELETED"],
    })
      .notNull()
      .default("ACTIVE"),
    isDeleted: boolean("is_deleted").default(false),
    lastLogin: timestamp("last_login"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    createdBy: text("created_by").default("system").notNull(),
    lastModifiedBy: text("last_modified_by"),
  },
  (table) => [
    index("idx_user_account_client_id").on(table.clientId),
  ]
);
