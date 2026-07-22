import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";
import { eq, and } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  const device = await db.query.devices.findFirst({
    where: eq(schema.devices.deviceId, 30712),
  });
  if (!device) throw new Error("Device 30712 not found");

  const chiwox = await db.query.clients.findFirst({
    where: eq(schema.clients.name, "Chiwox"),
  });
  if (!chiwox) throw new Error("Chiwox not found");

  const fiscalDay = await db.query.fiscalDays.findFirst({
    where: and(
      eq(schema.fiscalDays.clientId, chiwox.id),
      eq(schema.fiscalDays.deviceId, device.id),
      eq(schema.fiscalDays.fiscalDayNo, 5)
    ),
  });

  const existing = await db.query.receipts.findFirst({
    where: and(
      eq(schema.receipts.clientId, chiwox.id),
      eq(schema.receipts.receiptGlobalNo, 1)
    ),
  });
  if (existing) {
    console.log("Already exists:", existing.id);
    return;
  }

  const fiscalPayloadJson = JSON.stringify({
    receipt: {
      receiptGlobalNo: 1,
      receiptCounter: 1,
      receiptType: "FISCAL_INVOICE",
      invoiceNo: "INV-30712-20260718-0002",
      externalReference: "EXT-30712-20260718-0001",
      receiptDate: "2026-07-18",
      receiptTime: "19:57:00",
      operatorId: "test.cashier",
      fiscalDayNo: 5,
      lines: [
        { lineNo: 1, articleName: "Fresh Milk 1L", articleCode: "04012000", quantity: 6, unitPrice: 2.50, totalPrice: 15.00, taxRate: 15.5, taxAmount: 1.96 },
        { lineNo: 2, articleName: "White Sugar 2kg", articleCode: "17019900", quantity: 4, unitPrice: 5.00, totalPrice: 20.00, taxRate: 15.5, taxAmount: 2.73 },
      ],
      payments: [{ paymentType: "CASH", paymentAmount: 40.43 }],
      taxes: [{ taxCode: "TAX_15.5", taxRate: 15.5, taxAmount: 5.43 }],
      buyer: {
        name: "Harare Fresh Mart Pvt Ltd",
        tin: "2000000120",
        address: "78 Robert Mugabe Road, Harare",
        contact: "+263775001222",
      },
    },
  });

  const fdmsResponseJson = JSON.stringify({
    OperationId: "0HNN4RAMHUGBL:00000001",
    DeviceId: 30712,
    ReceiptId: 11360205,
    ReceiptGlobalNo: 1,
    Signature: "AtYMqYdeUHTFwycfbeE0mnekqyq3czlxiGzWoYPJ1IE=",
  });

  const [receipt] = await db
    .insert(schema.receipts)
    .values({
      clientId: chiwox.id,
      deviceId: device.id,
      fiscalDayId: fiscalDay?.id,
      fiscalDayNo: 5,
      receiptGlobalNo: 1,
      receiptCounter: 1,
      receiptType: "FISCAL_INVOICE",
      invoiceNo: "INV-30712-20260718-0002",
      externalReference: "EXT-30712-20260718-0001",
      originalPayloadJson: fiscalPayloadJson,
      fiscalPayloadJson,
      fdmsResponseJson,
      fdmsOperationId: "0HNN4RAMHUGBL:00000001",
      fdmsReceiptId: 11360205,
      fdmsServerSignatureHash: "AtYMqYdeUHTFwycfbeE0mnekqyq3czlxiGzWoYPJ1IE=",
      fdmsServerSignature: "AtYMqYdeUHTFwycfbeE0mnekqyq3czlxiGzWoYPJ1IE=",
      status: "FISCALISED",
      receivedAt: new Date("2026-07-18T19:57:00Z"),
      fiscalisedAt: new Date("2026-07-18T19:57:00Z"),
      createdBy: "import-script",
    })
    .returning();

  console.log("Receipt imported:", receipt.id, "Global No:", receipt.receiptGlobalNo);
}

main().catch(console.error);
