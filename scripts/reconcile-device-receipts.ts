import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import { Agent } from "undici";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";
import { eq, and } from "drizzle-orm";
import { getDeviceStatus } from "../src/integration/zimra/device";

const neonAgent = new Agent({ connect: { family: 4 } });
const sql = neon(process.env.DATABASE_URL!, {
  fetchOptions: { dispatcher: neonAgent },
});
const db = drizzle(sql, { schema });

const deviceID = Number(process.argv[2] || 30712);

async function main() {
  const device = await db.query.devices.findFirst({
    where: eq(schema.devices.deviceId, deviceID),
  });
  if (!device) throw new Error(`Device ${deviceID} not found`);
  if (!device.certificate) throw new Error("Device has no certificate");
  if (!device.keyMaterialUrls) throw new Error("Device has no key material URLs");

  const urls = JSON.parse(device.keyMaterialUrls);
  const privateKeyPem = await (
    await fetch(urls.privateKeyUrl, { dispatcher: neonAgent } as RequestInit)
  ).text();

  const status = await getDeviceStatus(
    device.deviceId as number,
    device.deviceModelName || "FiscalEdge",
    device.deviceModelVersion || "1.0.0",
    device.certificate,
    privateKeyPem
  );

  const zimraLast = status.lastReceiptGlobalNo;
  if (zimraLast == null) throw new Error("GetStatus did not return lastReceiptGlobalNo");
  const zimraDay = status.lastFiscalDayNo ?? null;

  const existing = await db
    .select({ g: schema.receipts.receiptGlobalNo, d: schema.receipts.fiscalDayNo })
    .from(schema.receipts)
    .where(
      and(
        eq(schema.receipts.clientId, device.clientId),
        eq(schema.receipts.deviceId, device.id)
      )
    );

  const present = new Set<number>();
  const known: { g: number; d: number | null }[] = [];
  for (const r of existing) {
    if (r.g != null) {
      present.add(r.g);
      known.push({ g: r.g, d: r.d });
    }
  }
  known.sort((a, b) => a.g - b.g);

  const missing: number[] = [];
  for (let i = 1; i <= zimraLast; i++) if (!present.has(i)) missing.push(i);

  const dayFor = (g: number): number | null => {
    const below = known.filter((k) => k.g < g).pop();
    if (below?.d != null) return below.d;
    const above = known.find((k) => k.g > g);
    if (above?.d != null) return above.d;
    return null;
  };

  console.log(
    `Device ${device.deviceId} — ZIMRA lastReceiptGlobalNo=${zimraLast}, lastFiscalDayNo=${zimraDay}`
  );
  console.log(
    `Local globals: ${known.map((k) => k.g).join(",") || "(none)"}`
  );
  if (missing.length === 0) {
    console.log("No missing globals — sequence is already contiguous. Nothing to backfill.");
    return;
  }
  console.log(`Missing globals to backfill: ${missing.join(", ")}`);

  const now = new Date();
  const rows = missing.map((g) => {
    const day = dayFor(g);
    return {
      clientId: device.clientId,
      deviceId: device.id,
      shopId: null as string | null,
      fiscalDayId: null as string | null,
      fiscalDayNo: day,
      receiptGlobalNo: g,
      receiptCounter: null as number | null,
      receiptType: "FISCALINVOICE",
      invoiceNo: `RECONCILED-${g}`,
      externalReference: `RECONCILED-${g}-${device.deviceId}`,
      receiptNumber: null as string | null,
      originalPayloadJson: JSON.stringify({
        reconciled: true,
        note: "Backfilled by reconcile script: record exists on ZIMRA (accepted/stored) but was never persisted locally.",
        zimraLastReceiptGlobalNo: zimraLast,
      }),
      fiscalPayloadJson: JSON.stringify({
        receipt: {
          receiptGlobalNo: g,
          receiptType: "FISCALINVOICE",
          invoiceNo: `RECONCILED-${g}`,
          fiscalDayNo: day,
        },
        reconciled: true,
      }),
      signedPayloadJson: null,
      fdmsResponseJson: null,
      fdmsOperationId: null,
      fdmsReceiptId: null,
      fdmsServerDate: null,
      fdmsServerSignatureHash: null,
      fdmsServerSignature: null,
      fdmsServerSignatureThumbprint: null,
      status: "FDMS_ACCEPTED_WITH_VALIDATION_ERRORS",
      retryCount: 0,
      errorCode: null,
      errorMessage: null,
      receivedAt: now,
      processedAt: now,
      signedAt: null,
      sentAt: now,
      fiscalisedAt: now,
      lastRetryAt: null,
      createdBy: "reconcile-script",
      lastModifiedBy: "reconcile-script",
    };
  });

  const inserted = await db.insert(schema.receipts).values(rows as any).returning({
    id: schema.receipts.id,
    receiptGlobalNo: schema.receipts.receiptGlobalNo,
    fiscalDayNo: schema.receipts.fiscalDayNo,
  });
  console.log(`Inserted ${inserted.length} reconciled receipt(s):`);
  for (const r of inserted) console.log(`  global=${r.receiptGlobalNo} day=${r.fiscalDayNo}`);

  const openDay = await db.query.fiscalDays.findFirst({
    where: and(
      eq(schema.fiscalDays.clientId, device.clientId),
      eq(schema.fiscalDays.deviceId, device.id),
      eq(schema.fiscalDays.status, "OPENED")
    ),
    orderBy: (fd, { desc }) => [desc(fd.fiscalDayNo)],
  });

  if (openDay) {
    const lastReceiptInDay = await db.query.receipts.findFirst({
      where: and(
        eq(schema.receipts.clientId, device.clientId),
        eq(schema.receipts.deviceId, device.id),
        eq(schema.receipts.fiscalDayNo, openDay.fiscalDayNo)
      ),
      orderBy: (r, { desc }) => [desc(r.receiptGlobalNo)],
    });
    await db
      .update(schema.fiscalDays)
      .set({
        lastReceiptGlobalNo: zimraLast,
        receiptCounter: lastReceiptInDay?.receiptCounter ?? openDay.receiptCounter ?? 0,
        lastModifiedBy: "reconcile-script",
      })
      .where(eq(schema.fiscalDays.id, openDay.id));
    console.log(
      `Updated open fiscal day #${openDay.fiscalDayNo}: lastReceiptGlobalNo=${zimraLast}, receiptCounter=${lastReceiptInDay?.receiptCounter ?? openDay.receiptCounter ?? 0}`
    );
  }

  console.log("Done. Next receipt will use receiptGlobalNo =", zimraLast + 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
