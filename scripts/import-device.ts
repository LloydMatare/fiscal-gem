import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";
import { UTApi } from "uploadthing/server";
import fs from "fs/promises";
import path from "path";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });
const utapi = new UTApi();

const CERT_DIR = "/home/kronos/Downloads/30712";

async function main() {
  // 1. Find Chiwox client
  const chiwox = await db.query.clients.findFirst({
    where: eq(schema.clients.name, "Chiwox"),
  });

  if (!chiwox) {
    console.error("Chiwox client not found in DB");
    process.exit(1);
  }
  console.log(`Found Chiwox client: ${chiwox.id}`);

  // 2. Read all cert files
  const [privateKeyPem, publicKeyPem, csrPem, certificatePem] =
    await Promise.all([
      fs.readFile(path.join(CERT_DIR, "private_key.pem"), "utf-8"),
      fs.readFile(path.join(CERT_DIR, "public_key.pem"), "utf-8"),
      fs.readFile(path.join(CERT_DIR, "device.csr"), "utf-8"),
      fs.readFile(path.join(CERT_DIR, "device_certificate.pem"), "utf-8"),
    ]);

  const registrationResponseJson = await fs.readFile(
    path.join(CERT_DIR, "register_device_response.json"),
    "utf-8"
  );

  const csrPayload = csrPem
    .replace(/-----BEGIN CERTIFICATE REQUEST-----/, "")
    .replace(/-----END CERTIFICATE REQUEST-----/, "")
    .replace(/\n/g, "")
    .trim();

  // 3. Upload to UploadThing
  const prefix = `${chiwox.id}/30712`;
  const files = [
    new File([privateKeyPem], `${prefix}/private-key.pem`, { type: "text/plain" }),
    new File([publicKeyPem], `${prefix}/public-key.pem`, { type: "text/plain" }),
    new File([csrPem], `${prefix}/csr.pem`, { type: "text/plain" }),
    new File([csrPayload], `${prefix}/csr-payload.txt`, { type: "text/plain" }),
    new File([certificatePem], `${prefix}/certificate.pem`, { type: "text/plain" }),
  ];

  console.log("Uploading to UploadThing...");
  const uploaded = await utapi.uploadFiles(files);
  const urls = {
    privateKeyUrl: uploaded[0].data?.url ?? "",
    publicKeyUrl: uploaded[1].data?.url ?? "",
    csrUrl: uploaded[2].data?.url ?? "",
    csrPayloadUrl: uploaded[3].data?.url ?? "",
    certificateUrl: uploaded[4].data?.url ?? "",
  };
  console.log("Uploaded:", urls);

  // 4. Insert device into DB
  console.log("Inserting device into DB...");
  const [device] = await db
    .insert(schema.devices)
    .values({
      deviceId: 30712,
      serialNumber: "chiwox-1",
      deviceModelName: "server",
      deviceModelVersion: "v1",
      commonName: "ZIMRA-chiwox-1-30712",
      csr: csrPem,
      certificate: certificatePem,
      registrationResponseJson,
      keyMaterialUrls: JSON.stringify(urls),
      activated: true,
      clientId: chiwox.id,
      createdBy: "import-script",
    })
    .returning();

  console.log("Device imported successfully:", device);
}

main().catch(console.error);
