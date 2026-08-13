import fs from "node:fs";
import path from "node:path";
import { config as dotenvConfig } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) dotenvConfig({ path: envPath });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

await migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migrations applied successfully");
