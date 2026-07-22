import { NextRequest } from "next/server";
import { db } from "@/db";
import { devices, receipts, fiscalDays } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/tenant";
import { apiSuccess, apiError } from "@/lib/api-response";
import { submitReceipt } from "@/integration/zimra/receipt";
import { downloadFileAsText } from "@/services/certificate";

// POST /admin/clients/[clientId]/device/submit-receipt
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    await requireAdmin();
    const { clientId } = await params;
    const body = await req.json();

    const {
      deviceID,
      deviceModelName,
      deviceModelVersion,
      receipt: receiptInput,
    } = body;

    if (!deviceID || !receiptInput) {
      return apiError({
        statusCode: 400,
        message: "deviceID and receipt are required",
      });
    }

    const device = await db.query.devices.findFirst({
      where: and(eq(devices.clientId, clientId), eq(devices.deviceId, deviceID)),
    });

    if (!device) {
      return apiError({ statusCode: 404, message: "Device not found" });
    }

    if (!device.certificate) {
      return apiError({ statusCode: 400, message: "Device certificate not found" });
    }

    let privateKeyPem: string;
    try {
      if (!device.keyMaterialUrls) throw new Error("No key material URLs");
      const urls = JSON.parse(device.keyMaterialUrls);
      privateKeyPem = await downloadFileAsText(urls.privateKeyUrl);
    } catch {
      return apiError({ statusCode: 400, message: "Device private key not found" });
    }

    // Get the previous receipt hash for chain
    const lastReceipt = await db.query.receipts.findFirst({
      where: and(
        eq(receipts.clientId, clientId),
        eq(receipts.deviceId, device.id)
      ),
      orderBy: (receipts, { desc }) => [desc(receipts.receiptGlobalNo)],
    });

    const previousReceiptHash = lastReceipt?.fdmsServerSignatureHash || undefined;

    // Get current open fiscal day
    const openFiscalDay = await db.query.fiscalDays.findFirst({
      where: and(
        eq(fiscalDays.clientId, clientId),
        eq(fiscalDays.deviceId, device.id),
        eq(fiscalDays.status, "OPENED")
      ),
      orderBy: (fiscalDays, { desc }) => [desc(fiscalDays.fiscalDayNo)],
    });

    // Build the receipt global number and counter
    const receiptGlobalNo = (lastReceipt?.receiptGlobalNo || 0) + 1;
    const receiptCounter = (lastReceipt?.receiptCounter || 0) + 1;

    const now = new Date();

    // Build the ZIMRA submit receipt request
    const zimraRequest = {
      receipt: {
        receiptGlobalNo,
        receiptCounter,
        receiptType: receiptInput.receiptType || "FISCAL_INVOICE",
        invoiceNo: receiptInput.invoiceNo || `INV-${receiptGlobalNo}`,
        externalReference: receiptInput.externalReference || `EXT-${Date.now()}`,
        receiptDate: receiptInput.receiptDate || now.toISOString().split("T")[0],
        receiptTime: receiptInput.receiptTime || now.toTimeString().split(" ")[0],
        operatorId: receiptInput.operatorId || "ADMIN",
        fiscalDayNo: openFiscalDay?.fiscalDayNo || 1,
        previousReceiptHash,
        lines: receiptInput.lines || [],
        payments: receiptInput.payments || [],
        taxes: receiptInput.taxes || [],
        buyer: receiptInput.buyer,
      },
    };

    // Submit to ZIMRA
    const zimraResponse = await submitReceipt(
      deviceID,
      deviceModelName || device.deviceModelName || "FiscalEdge",
      deviceModelVersion || device.deviceModelVersion || "1.0.0",
      device.certificate,
      privateKeyPem,
      zimraRequest
    );

    // Save receipt to DB
    const [receipt] = await db
      .insert(receipts)
      .values({
        clientId,
        deviceId: device.id,
        shopId: receiptInput.shopId,
        fiscalDayId: openFiscalDay?.id,
        fiscalDayNo: openFiscalDay?.fiscalDayNo,
        receiptGlobalNo,
        receiptCounter,
        receiptType: receiptInput.receiptType || "FISCAL_INVOICE",
        invoiceNo: zimraRequest.receipt.invoiceNo,
        externalReference: zimraRequest.receipt.externalReference,
        originalPayloadJson: JSON.stringify(receiptInput),
        fiscalPayloadJson: JSON.stringify(zimraRequest),
        fdmsResponseJson: JSON.stringify(zimraResponse),
        fdmsOperationId: zimraResponse.OperationId,
        fdmsReceiptId: zimraResponse.ReceiptId,
        fdmsServerDate: zimraResponse.ReceiptServerDate
          ? new Date(zimraResponse.ReceiptServerDate)
          : undefined,
        fdmsServerSignatureHash: zimraResponse.SignatureHash,
        fdmsServerSignature: zimraResponse.Signature,
        fdmsServerSignatureThumbprint: zimraResponse.SignatureThumbprint,
        status: "FISCALISED",
        receivedAt: now,
        fiscalisedAt: now,
        createdBy: "admin",
      })
      .returning();

    return apiSuccess({
      receipt,
      fdmsResponse: zimraResponse,
    });
  } catch (error: any) {
    return apiError({
      statusCode: error.status || 500,
      message: error.message || "Failed to submit receipt",
    });
  }
}
