import fs from "node:fs";
import path from "node:path";
import { config as dotenvConfig } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { sql } from "drizzle-orm";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) dotenvConfig({ path: envPath });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sqlClient = neon(process.env.DATABASE_URL);
const db = drizzle(sqlClient);

const APP_TABLES = [
  "agents",
  "clients",
  "customers",
  "devices",
  "fiscal_days",
  "fiscal_receipts",
  "shop_database_configs",
  "shops",
  "user_accounts",
];

async function appliedMigrationCount() {
  const journalExists = await db.execute(sql`
    select exists(
      select 1 from information_schema.tables
      where table_schema = 'drizzle' and table_name = '__drizzle_migrations'
    ) as ok
  `);
  if (!journalExists.rows[0].ok) return 0;
  const res = await db.execute(
    sql`select count(*)::int as n from drizzle.__drizzle_migrations`
  );
  return res.rows[0].n;
}

const appliedCount = await appliedMigrationCount();

// If no migration was ever recorded but schema tables exist, a previous run
// failed partway through (Postgres DDL is not transactional and partial
// CREATE TABLEs are left behind). Drop only those empty partial tables so the
// migration can re-apply cleanly. This is safe: an unjournaled DB has no
// real data.
if (appliedCount === 0) {
  const res = await db.execute(sql`
    select tablename from pg_tables where schemaname = 'public'
  `);
  const existing = new Set(res.rows.map((r) => r.tablename));
  const partial = APP_TABLES.filter((t) => existing.has(t));
  if (partial.length > 0) {
    console.warn(
      `WARN: detected partial migration state (no journal entries but tables exist): ${partial.join(", ")}`
    );
    console.warn("Dropping partial tables before re-applying migrations...");
    for (const t of partial) {
      await db.execute(sql.raw(`drop table if exists "public"."${t}" cascade`));
    }
  }
}

await migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migrations applied successfully");
