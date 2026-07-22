import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";
import { UTApi } from "uploadthing/server";
import fs from "fs/promises";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });
const utapi = new UTApi();

async function main() {
  const privateKeyPem = await fs.readFile("/home/kronos/Downloads/30712/private_key_fixed.pem", "utf-8");
  console.log("Read corrected private key");

  const chiwox = await db.query.clients.findFirst({
    where: eq(schema.clients.name, "Chiwox"),
  });
  if (!chiwox) throw new Error("Chiwox not found");

  const device = await db.query.devices.findFirst({
    where: eq(schema.devices.deviceId, 30712),
  });
  if (!device) throw new Error("Device not found");

  const prefix = `${chiwox.id}/30712`;
  const file = new File([privateKeyPem], `${prefix}/private-key.pem`, { type: "text/plain" });
  console.log("Uploading corrected private key...");
  const uploaded = await utapi.uploadFiles([file]);
  const newUrl = uploaded[0].data?.ufsUrl ?? "";
  console.log("New URL:", newUrl);

  const urls = JSON.parse(device.keyMaterialUrls || "{}");
  urls.privateKeyUrl = newUrl;
  await db.update(schema.devices)
    .set({ keyMaterialUrls: JSON.stringify(urls) })
    .where(eq(schema.devices.id, device.id));
  console.log("Done - DB updated");
}

main().catch(console.error);
