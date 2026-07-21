import { NextRequest } from "next/server";
import { db } from "@/db";
import { receipts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiCreated, apiError } from "@/lib/api-response";
import { signData, computeReceiptChainHash } from "@/services/signing";
import { readPrivateKeyPem } from "@/services/certificate";

// POST /s2s/receipts - Submit a receipt from an agent
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      clientId,
      deviceId,
      shopId,
      fiscalDayId,
      externalReference,
      receiptType,
      invoiceNo,
      originalPayloadJson,
      fiscalPayloadJson,
    } = body;

    if (!clientId || !deviceId || !externalReference || !fiscalPayloadJson) {
      return apiError({
        statusCode: 400,
        message: "clientId, deviceId, externalReference, and fiscalPayloadJson are required",
      });
    }

    // Check for duplicate external reference
    const existing = await db.query.receipts.findFirst({
      where: and(
        eq(receipts.clientId, clientId),
        eq(receipts.externalReference, externalReference)
      ),
    });

    if (existing) {
      return apiError({
        statusCode: 409,
        message: "Receipt with this external reference already exists",
      });
    }

    // Get the last receipt for chain hash
    const lastReceipt = await db.query.receipts.findFirst({
      where: eq(receipts.clientId, clientId),
      orderBy: (receipts, { desc }) => [desc(receipts.receiptGlobalNo)],
    });

    const previousReceiptHash = lastReceipt?.fdmsServerSignatureHash || undefined;

    // Compute chain hash
    const chainHash = computeReceiptChainHash(
      fiscalPayloadJson,
      previousReceiptHash
    );

    // Sign the receipt if private key is available
    let signedPayloadJson: string | null = null;
    try {
      const privateKeyPem = await readPrivateKeyPem(clientId, deviceId);
      const { signature, signatureHash } = signData(
        fiscalPayloadJson,
        privateKeyPem
      );
      signedPayloadJson = JSON.stringify({
        signature,
        signatureHash,
        chainHash,
      });
    } catch {
      // Key not found - receipt will be signed later
    }

    const receiptGlobalNo = (lastReceipt?.receiptGlobalNo || 0) + 1;
    const receiptCounter = (lastReceipt?.receiptCounter || 0) + 1;

    const [receipt] = await db
      .insert(receipts)
      .values({
        clientId,
        deviceId,
        shopId,
        fiscalDayId,
        fiscalDayNo: fiscalDayId ? 0 : undefined,
        receiptGlobalNo,
        receiptCounter,
        receiptType: receiptType || "STANDARD",
        invoiceNo,
        externalReference,
        originalPayloadJson: originalPayloadJson || fiscalPayloadJson,
        fiscalPayloadJson,
        signedPayloadJson,
        status: signedPayloadJson ? "SIGNED" : "RECEIVED",
        receivedAt: new Date(),
      })
      .returning();

    return apiCreated(receipt);
  } catch (error) {
    return apiError(error);
  }
}
