import { NextRequest } from "next/server";
import { db } from "@/db";
import { receipts, devices, fiscalDays } from "@/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { requireTenant } from "@/lib/tenant";
import { apiSuccess, apiError, getSearchParams } from "@/lib/api-response";
import { validateReceiptSubmit } from "@/lib/receipt-validation";
import { submitReceipt } from "@/integration/zimra/receipt";
import { getDeviceStatus } from "@/integration/zimra/device";
import { downloadFileAsText } from "@/services/certificate";
import crypto from "crypto";

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

// GET /tenant/receipts
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    const clientId = ctx.clientId!;
    const { page, limit, offset, status } = getSearchParams(req);

    const conditions = [eq(receipts.clientId, clientId)];
    if (status) conditions.push(eq(receipts.status, status as any));

    const whereClause = and(...conditions);

    const [{ total }] = await db
      .select({ total: count() })
      .from(receipts)
      .where(whereClause);

    const data = await db
      .select()
      .from(receipts)
      .where(whereClause)
      .orderBy(desc(receipts.createdAt))
      .limit(limit)
      .offset(offset);

    return apiSuccess({
      data: data.map(mapReceiptToSwagger),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return apiError(error);
  }
}

// POST /tenant/receipts
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    const clientId = ctx.clientId!;
    const body = await req.json();

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

    const device = await db.query.devices.findFirst({
      where: and(eq(devices.clientId, clientId), eq(devices.deviceId, deviceIdNum)),
    });
    if (!device) {
      return apiError({ statusCode: 404, message: "Device not found" });
    }

    let privateKeyPem: string;
    try {
      if (!device.keyMaterialUrls) throw new Error("No key material URLs");
      const urls = JSON.parse(device.keyMaterialUrls);
      privateKeyPem = await downloadFileAsText(urls.privateKeyUrl);
    } catch {
      return apiError({ statusCode: 400, message: "Device private key not found" });
    }

    const lastReceipt = await db.query.receipts.findFirst({
      where: and(eq(receipts.clientId, clientId), eq(receipts.deviceId, device.id)),
      orderBy: [desc(receipts.receiptGlobalNo)],
    });
    const previousReceiptHash = lastReceipt?.fdmsServerSignatureHash || undefined;

    const openFiscalDay = await db.query.fiscalDays.findFirst({
      where: and(
        eq(fiscalDays.clientId, clientId),
        eq(fiscalDays.deviceId, device.id),
        eq(fiscalDays.status, "OPENED")
      ),
      orderBy: [desc(fiscalDays.fiscalDayNo)],
    });

    let zimraFiscalDayNo: number | null = null;
    try {
      const status = await getDeviceStatus(
        deviceIdNum,
        device.deviceModelName || "FiscalEdge",
        device.deviceModelVersion || "1.0.0",
        device.certificate!,
        privateKeyPem
      );
      zimraFiscalDayNo = status.lastFiscalDayNo ?? null;
    } catch (e) {
      console.warn("Could not fetch device status for fiscal day:", e);
    }

    const fiscalDayNo = zimraFiscalDayNo || openFiscalDay?.fiscalDayNo || 1;
    const receiptGlobalNo = (lastReceipt?.receiptGlobalNo || 0) + 1;
    const receiptCounter = (lastReceipt?.receiptCounter || 0) + 1;
    const now = new Date();
    const datePart = now.toISOString().split("T")[0];
    const timePart = now.toTimeString().split(" ")[0];
    const receiptDate = `${datePart}T${timePart}`;

    const taxIdMap: Record<number, number> = { 0: 2, 5: 514, 15: 515, 15.5: 515 };
    const getTaxId = (rate: number) => {
      if (rate in taxIdMap) return taxIdMap[rate];
      if (rate > 0) return 515;
      return 2;
    };

    const paymentTypeMap: Record<string, number> = {
      CASH: 0, CARD: 1, BANK_TRANSFER: 2, MOBILE_MONEY: 3, CREDIT: 4,
    };

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
        receiptDate: receiptDate,
        operatorId: (receiptData.username as string) || (receiptData.operatorId as string) || "TENANT",
        fiscalDayNo,
        previousReceiptHash,
        receiptLinesTaxInclusive: receiptData.receiptLinesTaxInclusive !== false,
        receiptLines,
        receiptTaxes,
        receiptPayments,
        receiptTotal,
        receiptPrintForm: "Receipt48",
        buyer: receiptData.buyerData || receiptData.buyer || undefined,
      },
    };

    const externalRef = (body.externalReference as string) || `EXT-${Date.now()}`;

    const signedPayload: any = { ...zimraRequest };
    try {
      const receiptJson = JSON.stringify(zimraRequest.receipt);
      const privateKeyObj = crypto.createPrivateKey(privateKeyPem);
      const sign = crypto.createSign("SHA256");
      sign.update(receiptJson);
      sign.end();
      const derSignature = sign.sign(privateKeyObj);
      signedPayload.receipt = {
        ...zimraRequest.receipt,
        receiptDeviceSignature: {
          signedData: Buffer.from(receiptJson).toString("base64"),
          signature: derSignature.toString("base64"),
        },
      };
    } catch (signErr) {
      console.error("Failed to sign receipt:", signErr);
    }

    try {
      const zimraResponse = await submitReceipt(
        deviceIdNum,
        device.deviceModelName || "FiscalEdge",
        device.deviceModelVersion || "1.0.0",
        device.certificate!,
        privateKeyPem,
        signedPayload
      );

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

      // Only save receipt after successful ZIMRA response
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
          fdmsResponseJson: JSON.stringify(zimraResponse),
          fdmsOperationId: fdmsOpId,
          fdmsReceiptId: fdmsReceiptId,
          fdmsServerDate: fdmsServerDate ? new Date(fdmsServerDate) : undefined,
          fdmsServerSignatureHash: fdmsSignatureHash,
          fdmsServerSignature: fdmsSignature,
          fdmsServerSignatureThumbprint: fdmsThumbprint,
          status: fdmsOpId && fdmsReceiptId
            ? fdmsValidationErrors?.some((e: any) => e.validationErrorColor === "Red")
              ? "FDMS_ACCEPTED_WITH_VALIDATION_ERRORS"
              : "FISCALISED"
            : "FAILED",
          fiscalisedAt: fdmsOpId && fdmsReceiptId ? now : undefined,
          sentAt: now,
          processedAt: now,
          receivedAt: now,
          createdBy: "tenant",
        })
        .returning();

      return apiSuccess(mapReceiptToSwagger(savedReceipt), 201);
    } catch (zimraError: any) {
      return apiError({
        statusCode: zimraError.status || 502,
        message: `ZIMRA submission failed: ${zimraError.message}`,
      });
    }
  } catch (error) {
    return apiError(error);
  }
}
