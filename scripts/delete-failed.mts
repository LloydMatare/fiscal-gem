import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const { neon } = await import("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL!);
const result = await sql`DELETE FROM fiscal_receipts WHERE status = 'FAILED'`;
console.log("Deleted", result.length, "failed receipt(s)");
process.exit(0);
