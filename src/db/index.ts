import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { Agent } from "undici";
import * as schema from "./schema";

// Undici's default DNS resolution can hang on machines without working IPv6
// routing (it tries the IPv6 address first and times out instead of falling
// back to IPv4). Neon always supports IPv4, so pin the dispatcher to IPv4.
const neonAgent = new Agent({ connect: { family: 4 } });

const sql = neon(process.env.DATABASE_URL!, {
  fetchOptions: { dispatcher: neonAgent },
});

export const db = drizzle(sql, { schema });
