import { NextRequest } from "next/server";
import { db } from "@/db";
import { receipts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireTenant } from "@/lib/tenant";
import { apiSuccess, apiError } from "@/lib/api-response";

function mapReceiptToSwagger(r: any) {
  let signedFiscalPayload = null;
  if (r.signedPayloadJson) {
    try { signedFiscalPayload = JSON.parse(r.signedPayloadJson); } catch {}
  } else if (r.fiscalPayloadJson) {
    try { signedFiscalPayload = JSON.parse(r.fiscalPayloadJson); } catch {}
  }

  return {
    id: r.id,
    clientId: r.clientId,
    shopId: r.shopId,
    deviceId: r.deviceId,
    externalReference: r.externalReference,
    receiptNumber: r.receiptNumber,
    status: r.status,
    fdmsOperationId: r.fdmsOperationId,
    fdmsReceiptId: r.fdmsReceiptId,
    fdmsServerDate: r.fdmsServerDate?.toISOString?.() ?? r.fdmsServerDate ?? null,
    fdmsServerSignatureHash: r.fdmsServerSignatureHash,
    fdmsServerSignature: r.fdmsServerSignature,
    fdmsServerSignatureThumbprint: r.fdmsServerSignatureThumbprint,
    fdmsServerSignatureVerified: r.fdmsServerSignatureVerified ?? null,
    fdmsServerSignatureVerificationError: r.fdmsServerSignatureVerificationError,
    fdmsValidationErrorsJson: r.fdmsValidationErrorsJson,
    signedFiscalPayload,
    retryCount: r.retryCount,
    errorCode: r.errorCode,
    errorMessage: r.errorMessage,
    receivedAt: r.receivedAt?.toISOString?.() ?? r.receivedAt ?? null,
    processedAt: r.processedAt?.toISOString?.() ?? r.processedAt ?? null,
    signedAt: r.signedAt?.toISOString?.() ?? r.signedAt ?? null,
    sentAt: r.sentAt?.toISOString?.() ?? r.sentAt ?? null,
    fiscalisedAt: r.fiscalisedAt?.toISOString?.() ?? r.fiscalisedAt ?? null,
    lastRetryAt: r.lastRetryAt?.toISOString?.() ?? r.lastRetryAt ?? null,
    createdAt: r.createdAt?.toISOString?.() ?? r.createdAt ?? null,
    updatedAt: r.updatedAt?.toISOString?.() ?? r.updatedAt ?? null,
  };
}

// GET /tenant/receipts/[receiptId]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  try {
    const ctx = await requireTenant();
    const { receiptId } = await params;

    const receipt = await db.query.receipts.findFirst({
      where: and(
        eq(receipts.id, receiptId),
        eq(receipts.clientId, ctx.clientId!)
      ),
    });

    if (!receipt) {
      return apiError({ statusCode: 404, message: "Receipt not found" });
    }

    return apiSuccess(mapReceiptToSwagger(receipt));
  } catch (error) {
    return apiError(error);
  }
}
