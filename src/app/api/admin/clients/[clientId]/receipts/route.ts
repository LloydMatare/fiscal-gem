import { NextRequest } from "next/server";
import { db } from "@/db";
import { clients, receipts, devices, fiscalDays } from "@/db/schema";
import { eq, and, desc, count as drizzleCount } from "drizzle-orm";
import { requireAdmin } from "@/lib/tenant";
import { apiSuccess, apiError } from "@/lib/api-response";
import { validateReceiptSubmit } from "@/lib/receipt-validation";
import {
  validateReceiptForZimra,
  buildLocalValidationContext,
} from "@/lib/zimra-local-validation";
import { submitReceipt } from "@/integration/zimra/receipt";
import { getDeviceStatus } from "@/integration/zimra/device";
import { downloadFileAsText } from "@/services/certificate";
import { signReceiptDevice, getReceiptDeviceHash, formatReceiptDateForSignature } from "@/services/signing";

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
    deviceEntityId: r.deviceId,
    deviceId: undefined as number | undefined,
    externalReference: r.externalReference,
    receiptNumber: r.receiptNumber,
    receiptGlobalNo: r.receiptGlobalNo,
    invoiceNo: r.invoiceNo,
    receiptType: r.receiptType,
    receiptCounter: r.receiptCounter,
    fiscalDayNo: r.fiscalDayNo,
    status: r.status,
    fdmsOperationId: r.fdmsOperationId,
    fdmsReceiptId: r.fdmsReceiptId,
    fdmsServerDate: r.fdmsServerDate?.toISOString(),
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
    receivedAt: r.receivedAt?.toISOString(),
    processedAt: r.processedAt?.toISOString(),
    signedAt: r.signedAt?.toISOString(),
    sentAt: r.sentAt?.toISOString(),
    fiscalisedAt: r.fiscalisedAt?.toISOString(),
    lastRetryAt: r.lastRetryAt?.toISOString(),
    createdAt: r.createdAt?.toISOString(),
    updatedAt: r.updatedAt?.toISOString(),
  };
}

// GET /api/admin/clients/[clientId]/receipts
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    await requireAdmin();
    const { clientId } = await params;
    const { searchParams } = new URL(req.url);

    const client = await db.query.clients.findFirst({
      where: eq(clients.id, clientId),
    });
    if (!client) {
      return apiError({ statusCode: 404, message: "Client not found" });
    }

    const page = Math.max(0, parseInt(searchParams.get("page") || "0"));
    const size = Math.min(100, Math.max(1, parseInt(searchParams.get("size") || "20")));
    const statusFilter = searchParams.get("status") || undefined;

    const conditions = [eq(receipts.clientId, clientId)];
    if (statusFilter) {
      conditions.push(eq(receipts.status, statusFilter as any));
    }
    const where = and(...conditions);

    const [totalResult] = await db
      .select({ value: drizzleCount() })
      .from(receipts)
      .where(where);

    const totalElements = totalResult?.value || 0;
    const totalPages = Math.ceil(totalElements / size);

    const rows = await db.query.receipts.findMany({
      where,
      orderBy: [desc(receipts.receivedAt)],
      limit: size,
      offset: page * size,
    });

    // Fetch device deviceId numbers for each receipt
    const deviceIds = [...new Set(rows.map((r) => r.deviceId))];
    const deviceEntities = deviceIds.length
      ? await db.query.devices.findMany({
          where: (devices, { inArray }) => inArray(devices.id, deviceIds),
        })
      : [];
    const deviceMap = new Map(deviceEntities.map((d) => [d.id, d.deviceId]));

    const content = rows.map((r) => {
      const mapped = mapReceiptToSwagger(r);
      mapped.deviceId = deviceMap.get(r.deviceId) ?? undefined;
      return mapped;
    });

    return apiSuccess({
      content,
      number: page,
      size,
      totalElements,
      totalPages,
      first: page === 0,
      last: page >= totalPages - 1,
    });
  } catch (error) {
    return apiError(error);
  }
}

// POST /api/admin/clients/[clientId]/receipts
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    await requireAdmin();
    const { clientId } = await params;
    const body = await req.json();

    const client = await db.query.clients.findFirst({
      where: eq(clients.id, clientId),
    });
    if (!client) {
      return apiError({ statusCode: 404, message: "Client not found" });
    }

    // Validate
    const validation = await validateReceiptSubmit(clientId, body);
    if (!validation.valid) {
      return apiError({
        statusCode: 400,
        message: "Validation failed",
        errors: validation.errors.map((e) => `${e.field}: ${e.message}`),
      });
    }

    const deviceIdNum = body.deviceId as number;
    const fiscalPayload = body.fiscalPayload as Record<string, unknown>;
    const receiptData = fiscalPayload.receipt as Record<string, unknown>;

    // Find device
    const device = await db.query.devices.findFirst({
      where: and(eq(devices.clientId, clientId), eq(devices.deviceId, deviceIdNum)),
    });
    if (!device) {
      return apiError({ statusCode: 404, message: "Device not found" });
    }

    // Get private key
    let privateKeyPem: string;
    try {
      if (!device.keyMaterialUrls) throw new Error("No key material URLs");
      const urls = JSON.parse(device.keyMaterialUrls);
      privateKeyPem = await downloadFileAsText(urls.privateKeyUrl);
    } catch {
      return apiError({ statusCode: 400, message: "Device private key not found" });
    }

    // Get previous receipt for the device signature chain
    const lastReceipt = await db.query.receipts.findFirst({
      where: and(eq(receipts.clientId, clientId), eq(receipts.deviceId, device.id)),
      orderBy: [desc(receipts.receiptGlobalNo)],
    });

    // Get open fiscal day
    const openFiscalDay = await db.query.fiscalDays.findFirst({
      where: and(
        eq(fiscalDays.clientId, clientId),
        eq(fiscalDays.deviceId, device.id),
        eq(fiscalDays.status, "OPENED")
      ),
      orderBy: [desc(fiscalDays.fiscalDayNo)],
    });

    // Try to get authoritative fiscal day from ZIMRA
    let zimraFiscalDayNo: number | null = null;
    let zimraFiscalDayStatus: string | null = null;
    let zimraLastReceiptGlobalNo: number | null = null;
    try {
      const status = await getDeviceStatus(
        deviceIdNum,
        device.deviceModelName || "FiscalEdge",
        device.deviceModelVersion || "1.0.0",
        device.certificate!,
        privateKeyPem
      );
      zimraFiscalDayNo = status.lastFiscalDayNo ?? null;
      zimraFiscalDayStatus = status.fiscalDayStatus ?? null;
      zimraLastReceiptGlobalNo = status.lastReceiptGlobalNo ?? null;
    } catch (e) {
      console.warn("Could not fetch device status for fiscal day:", e);
    }
    const fiscalDayNo = zimraFiscalDayNo || openFiscalDay?.fiscalDayNo || 1;

    // Fetch device config for valid tax IDs
    const { getDeviceConfig } = await import("@/integration/zimra/device");
    let validTaxIds: Record<number, number> = { 0: 2, 5: 514, 15: 515, 15.5: 515 };
    let deviceConfig: { taxpayerDayMaxHrs?: number | null; vatNumber?: string | null } | null = null;
    try {
      const config = await getDeviceConfig(
        deviceIdNum,
        device.deviceModelName || "FiscalEdge",
        device.deviceModelVersion || "1.0.0",
        device.certificate!,
        privateKeyPem
      );
      if (config.applicableTaxes?.length) {
        const taxMap: Record<number, number> = {};
        for (const tax of config.applicableTaxes) {
          if (tax.taxID && tax.taxPercent) {
            taxMap[tax.taxPercent] = tax.taxID;
          }
        }
        if (Object.keys(taxMap).length > 0) {
          validTaxIds = { ...validTaxIds, ...taxMap };
        }
      }
      deviceConfig = {
        taxpayerDayMaxHrs: config.taxPayerDayMaxHrs ?? null,
        vatNumber: config.vatNumber ?? null,
      };
    } catch (e) {
      console.warn("Could not fetch device config for tax IDs:", e);
    }

    // Build receipt numbers: counter is fiscal-day scoped (resets to 1 on a new
    // day), global number is ZIMRA-authoritative when available.
    const lastReceiptInOpenDay = !!(
      openFiscalDay && lastReceipt && lastReceipt.fiscalDayNo === openFiscalDay.fiscalDayNo
    );
    const receiptGlobalNo = (zimraLastReceiptGlobalNo ?? lastReceipt?.receiptGlobalNo ?? 0) + 1;
    const receiptCounter = lastReceiptInOpenDay
      ? (lastReceipt?.receiptCounter || 0) + 1
      : 1;

    // Chain hash is the previous receipt's DEVICE signature hash; omitted for
    // the first receipt of a fiscal day (counter == 1).
    const isFirstInFiscalDay = receiptCounter === 1;
    const previousReceiptHash = lastReceiptInOpenDay
      ? getReceiptDeviceHash(lastReceipt?.fiscalPayloadJson ?? null)
      : undefined;
    const now = new Date();

    // Build ZIMRA request matching SubmitReceiptRequest interface
    const nowStr = now.toISOString();

    // Map tax rate to ZIMRA taxID
    const getTaxId = (rate: number) => {
      if (rate in validTaxIds) return validTaxIds[rate];
      if (rate > 0) return 515;
      return 2;
    };

    // Map frontend paymentType to ZIMRA moneyTypeCode
    const paymentTypeMap: Record<string, number> = {
      CASH: 0, CARD: 1, BANK_TRANSFER: 2, MOBILE_MONEY: 3, CREDIT: 4,
    };

    // Transform receipt lines to ZIMRA format
    const receiptLines = ((receiptData.receiptLines || receiptData.lines || []) as any[]).map((l: any, i: number) => ({
      receiptLineType: "Sale",
      receiptLineNo: l.receiptLineNo || l.lineNo || i + 1,
      receiptLineHSCode: l.receiptLineHSCode || l.articleCode || "04021099",
      receiptLineName: l.receiptLineName || l.articleName,
      receiptLinePrice: String(l.receiptLinePrice || l.unitPrice),
      receiptLineQuantity: String(l.receiptLineQuantity || l.quantity),
      receiptLineTotal: Number(((l.receiptLineQuantity || l.quantity) * (l.receiptLinePrice || l.unitPrice)).toFixed(2)),
      taxID: getTaxId(l.taxPercent || l.taxRate || 0),
      ...(l.taxPercent || l.taxRate ? { taxPercent: l.taxPercent || l.taxRate } : {}),
    }));

    // Build consolidated receiptTaxes
    const taxGroups: Record<number, { taxAmount: number; salesAmountWithTax: number; taxPercent?: number }> = {};
    for (const line of receiptLines) {
      const tid = line.taxID;
      if (!taxGroups[tid]) taxGroups[tid] = { taxAmount: 0, salesAmountWithTax: 0 };
      const lineTax = line.taxPercent
        ? Number((line.receiptLineTotal * line.taxPercent / (100 + line.taxPercent)).toFixed(2))
        : 0;
      taxGroups[tid].taxAmount += lineTax;
      taxGroups[tid].salesAmountWithTax += line.receiptLineTotal;
      if (line.taxPercent !== undefined) taxGroups[tid].taxPercent = line.taxPercent;
    }
    const receiptTaxes = Object.entries(taxGroups).map(([taxID, g]) => ({
      taxID: Number(taxID),
      ...(g.taxPercent !== undefined ? { taxPercent: g.taxPercent } : {}),
      taxAmount: Number(g.taxAmount.toFixed(2)),
      salesAmountWithTax: Number(g.salesAmountWithTax.toFixed(2)),
    }));

    // Transform payments to ZIMRA format
    const receiptTotal = Number(receiptLines.reduce((sum: number, l: any) => sum + l.receiptLineTotal, 0).toFixed(2));

    const totalPaymentFromInput = ((receiptData.receiptPayments || receiptData.payments || []) as any[]).reduce(
      (sum: number, p: any) => sum + (p.paymentAmount || 0), 0
    );
    const receiptPayments = ((receiptData.receiptPayments || receiptData.payments || []) as any[]).map((p: any, i: number, arr: any[]) => {
      const moneyTypeCode = paymentTypeMap[p.paymentType] ?? paymentTypeMap[p.moneyTypeCode] ?? 0;
      if (arr.length === 1) {
        return { moneyTypeCode, paymentAmount: receiptTotal };
      }
      const proportion = totalPaymentFromInput > 0 ? (p.paymentAmount / totalPaymentFromInput) : (1 / arr.length);
      return { moneyTypeCode, paymentAmount: Number((receiptTotal * proportion).toFixed(2)) };
    });
    // Ensure sum exactly equals receiptTotal
    const totalPayments = receiptPayments.reduce((s: number, p: any) => s + p.paymentAmount, 0);
    if (receiptPayments.length > 0 && Math.abs(totalPayments - receiptTotal) > 0.001) {
      const diff = Number((receiptTotal - totalPayments).toFixed(2));
      receiptPayments[receiptPayments.length - 1].paymentAmount = Number(
        (receiptPayments[receiptPayments.length - 1].paymentAmount + diff).toFixed(2)
      );
    }

    const zimraRequest = {
      receipt: {
        receiptGlobalNo,
        receiptCounter,
        receiptType: (receiptData.receiptType as string) || "FISCALINVOICE",
        receiptCurrency: (receiptData.receiptCurrency as string) || "USD",
        invoiceNo: (receiptData.invoiceNo as string) || `INV-${receiptGlobalNo}`,
        externalReference: (body.externalReference as string) || `EXT-${Date.now()}`,
        receiptDate: formatReceiptDateForSignature((receiptData.receiptDate as string) || nowStr),
        operatorId: (receiptData.username as string) || (receiptData.operatorId as string) || "ADMIN",
        fiscalDayNo,
        ...(isFirstInFiscalDay ? {} : { previousReceiptHash }),
        receiptLinesTaxInclusive: receiptData.receiptLinesTaxInclusive !== false,
        receiptLines,
        receiptTaxes,
        receiptPayments,
        receiptTotal,
        receiptPrintForm: "Receipt48",
        buyer: receiptData.buyerData || receiptData.buyer || undefined,
      },
    };

    // Save as RECEIVED first
    const externalRef = (body.externalReference as string) || `EXT-${Date.now()}`;

    // Sign the canonical receipt line (spec §13.2.1) with the device ECDSA
    // P-256 private key. The SignatureData shape ZIMRA expects is
    // { hash, signature } where hash = SHA-256 of the canonical line.
    const signedPayload: any = { ...zimraRequest };
    try {
      const receiptDeviceSignature = signReceiptDevice(
        {
          deviceID: deviceIdNum,
          receiptType: zimraRequest.receipt.receiptType,
          receiptCurrency: zimraRequest.receipt.receiptCurrency,
          receiptGlobalNo,
          receiptDate: zimraRequest.receipt.receiptDate,
          receiptTotal,
          receiptTaxes,
          previousReceiptHash,
          isFirstInFiscalDay,
        },
        privateKeyPem,
        "der"
      );
      signedPayload.receipt = {
        ...zimraRequest.receipt,
        receiptDeviceSignature,
      };
    } catch (signErr) {
      console.error("Failed to sign receipt:", signErr);
    }

    // Run local ZIMRA-style validation BEFORE submitting to ZIMRA.
    const localValidation = await validateReceiptForZimra(
      signedPayload.receipt,
      buildLocalValidationContext({
        validTaxIds,
        certificatePem: device.certificate ?? undefined,
        clientId,
        deviceId: deviceIdNum,
        fiscalDay: openFiscalDay
          ? { fiscalDayOpened: openFiscalDay.fiscalDayOpened, fiscalDayNo: openFiscalDay.fiscalDayNo }
          : null,
        deviceConfig,
        lastReceipt,
        authoritativeFiscalDayNo: zimraFiscalDayNo,
        authoritativeFiscalDayStatus: zimraFiscalDayStatus,
        authoritativeLastReceiptGlobalNo: zimraLastReceiptGlobalNo,
        serverNow: now,
      })
    );

    if (!localValidation.valid) {
      return apiError({
        statusCode: 400,
        message: "Receipt failed local validation — not sent to ZIMRA",
        errors: localValidation.errors,
      });
    }
    const [savedReceipt] = await db
      .insert(receipts)
      .values({
        clientId,
        deviceId: device.id,
        shopId: body.shopId || null,
        fiscalDayId: openFiscalDay?.id,
        fiscalDayNo: openFiscalDay?.fiscalDayNo,
        receiptGlobalNo,
        receiptCounter,
        receiptType: (receiptData.receiptType as string) || "FISCALINVOICE",
        invoiceNo: zimraRequest.receipt.invoiceNo,
        externalReference: externalRef,
        receiptNumber: (body.receiptNumber as string) || null,
        originalPayloadJson: JSON.stringify(body.originalPayload || body),
        fiscalPayloadJson: JSON.stringify(signedPayload),
        status: "RECEIVED",
        receivedAt: now,
        createdBy: "admin",
      })
      .returning();

    // Submit to ZIMRA
    try {
      const zimraResponse = await submitReceipt(
        deviceIdNum,
        device.deviceModelName || "FiscalEdge",
        device.deviceModelVersion || "1.0.0",
        device.certificate!,
        privateKeyPem,
        signedPayload
      );

      // Normalize ZIMRA response fields (camelCase vs PascalCase)
      const fdmsOpId = zimraResponse.OperationId || zimraResponse.operationID || null;
      const fdmsReceiptId = zimraResponse.ReceiptId || zimraResponse.receiptID || null;
      const fdmsServerDate = zimraResponse.ReceiptServerDate || zimraResponse.serverDate || null;
      const fdmsSignatureHash = zimraResponse.SignatureHash
        || zimraResponse.receiptServerSignature?.hash
        || null;
      const fdmsSignature = zimraResponse.Signature
        || zimraResponse.receiptServerSignature?.signature
        || null;
      const fdmsThumbprint = zimraResponse.SignatureThumbprint
        || zimraResponse.receiptServerSignature?.certificateThumbprint
        || null;
      const fdmsValidationErrors = zimraResponse.validationErrors || null;

      // Update receipt with FDMS response
      const [updated] = await db
        .update(receipts)
        .set({
          fdmsResponseJson: JSON.stringify(zimraResponse),
          fdmsOperationId: fdmsOpId,
          fdmsReceiptId: fdmsReceiptId,
          fdmsServerDate: fdmsServerDate ? new Date(fdmsServerDate) : undefined,
          fdmsServerSignatureHash: fdmsSignatureHash,
          fdmsServerSignature: fdmsSignature,
          fdmsServerSignatureThumbprint: fdmsThumbprint,
          status: fdmsOpId && fdmsReceiptId
            ? (fdmsValidationErrors?.length ?? 0) > 0
              ? "FDMS_ACCEPTED_WITH_VALIDATION_ERRORS"
              : "FISCALISED"
            : "FAILED",
          fiscalisedAt: fdmsOpId && fdmsReceiptId ? now : undefined,
          sentAt: now,
          processedAt: now,
          updatedAt: now,
        })
        .where(eq(receipts.id, savedReceipt.id))
        .returning();

      return apiSuccess(mapReceiptToSwagger(updated), 201);
    } catch (zimraError: any) {
      // ZIMRA submission failed — update receipt as FAILED
      await db
        .update(receipts)
        .set({
          status: "FAILED",
          errorCode: zimraError.code || "ZIMRA_ERROR",
          errorMessage: zimraError.message || "Failed to submit to ZIMRA",
          updatedAt: now,
        })
        .where(eq(receipts.id, savedReceipt.id));

      return apiError({
        statusCode: zimraError.status || 502,
        message: `Receipt saved but ZIMRA submission failed: ${zimraError.message}`,
      });
    }
  } catch (error) {
    return apiError(error);
  }
}
