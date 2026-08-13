import { NextRequest } from "next/server";
import { db } from "@/db";
import { devices, receipts, fiscalDays } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/tenant";
import { apiSuccess, apiError } from "@/lib/api-response";
import { submitReceipt } from "@/integration/zimra/receipt";
import { getDeviceStatus, getDeviceConfig } from "@/integration/zimra/device";
import { downloadFileAsText } from "@/services/certificate";
import { resolveReceiptSequence } from "@/services/receipt-sequencing";
import {
  validateReceiptForZimra,
  buildLocalValidationContext,
} from "@/lib/zimra-local-validation";
import { signReceiptDevice, formatReceiptDateForSignature } from "@/services/signing";

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

    const now = new Date();

    // Fetch device status from ZIMRA to get the authoritative fiscal day number
    let zimraFiscalDayNo: number | null = null;
    let zimraFiscalDayStatus: string | null = null;
    let zimraLastReceiptGlobalNo: number | null = null;
    let zimraReachable = true;
    try {
      const status = await getDeviceStatus(
        deviceID,
        device.deviceModelName || "FiscalEdge",
        device.deviceModelVersion || "1.0.0",
        device.certificate,
        privateKeyPem
      );
      zimraFiscalDayNo = status.lastFiscalDayNo ?? null;
      zimraFiscalDayStatus = status.fiscalDayStatus ?? null;
      zimraLastReceiptGlobalNo = status.lastReceiptGlobalNo ?? null;
      zimraReachable = true;
    } catch (e) {
      console.warn("Could not fetch device status for fiscal day:", e);
      zimraReachable = false;
    }

    // Fetch device config for valid tax IDs
    let validTaxIds: Record<number, number> = { 0: 2, 5: 514, 15: 515, 15.5: 515 };
    let deviceConfig: { taxpayerDayMaxHrs?: number | null; vatNumber?: string | null } | null = null;
    try {
      const config = await getDeviceConfig(
        deviceID,
        device.deviceModelName || "FiscalEdge",
        device.deviceModelVersion || "1.0.0",
        device.certificate,
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

    // Get the previous receipt for the device signature chain
    const lastReceipt = await db.query.receipts.findFirst({
      where: and(
        eq(receipts.clientId, clientId),
        eq(receipts.deviceId, device.id)
      ),
      orderBy: (receipts, { desc }) => [desc(receipts.receiptGlobalNo)],
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

    // Determine fiscal day number: ZIMRA status > local DB > form input > default 1
    const fiscalDayNo = zimraFiscalDayNo
      || receiptInput.fiscalDayNo
      || 1;

    // Build the receipt global number (ZIMRA-authoritative) and the
    // fiscal-day-scoped counter. Divergence between ZIMRA and local state is a
    // hard error — we never fall back to the local counter (that is what
    // produces RCPT012 "Receipt global number is not sequential").
    const sequence = await resolveReceiptSequence({
      clientId,
      deviceUuid: device.id,
      zimraLastReceiptGlobalNo,
      zimraReachable,
      localLastReceipt: lastReceipt,
      openFiscalDayNo: openFiscalDay?.fiscalDayNo ?? null,
    });

    if (!sequence.ok) {
      return apiError({
        statusCode: 409,
        message: "Receipt numbering is out of sync with ZIMRA — not sent to ZIMRA",
        errors: sequence.errors,
      });
    }

    const { receiptGlobalNo, receiptCounter, isFirstInFiscalDay, previousReceiptHash } = sequence;

    const datePart = receiptInput.receiptDate || now.toISOString().split("T")[0];
    const timePart = receiptInput.receiptTime || now.toTimeString().split(" ")[0];
    const receiptDate = formatReceiptDateForSignature(
      datePart.includes("T") ? datePart : `${datePart}T${timePart}`
    );

    // Map frontend receiptType to ZIMRA enum
    const receiptTypeMap: Record<string, string> = {
      FISCAL_INVOICE: "FISCALINVOICE",
      FISCAL_CREDIT_NOTE: "CREDITNOTE",
      FISCAL_DEBIT_NOTE: "DEBITNOTE",
    };
    const receiptType = receiptTypeMap[receiptInput.receiptType] || receiptInput.receiptType || "FISCALINVOICE";

    // Map tax rate to ZIMRA taxID (using device config if available)
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
    const receiptLines = (receiptInput.lines || []).map((l: any, i: number) => ({
      receiptLineType: "Sale",
      receiptLineNo: l.lineNo || i + 1,
      receiptLineHSCode: l.articleCode || "04021099",
      receiptLineName: l.articleName,
      receiptLinePrice: String(l.unitPrice),
      receiptLineQuantity: String(l.quantity),
      receiptLineTotal: Number((l.quantity * l.unitPrice).toFixed(2)),
      taxID: getTaxId(l.taxRate || 0),
      ...(l.taxRate ? { taxPercent: l.taxRate } : {}),
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

    // receiptTotal is the sum of line totals (tax-inclusive)
    const receiptTotal = Number(receiptLines.reduce((sum: number, l: any) => sum + l.receiptLineTotal, 0).toFixed(2));

    // RCPT039 fix: paymentAmount MUST equal receiptTotal
    // Sum all line totals as the receipt total, then force payment to match
    const totalPaymentFromInput = (receiptInput.payments || []).reduce(
      (sum: number, p: any) => sum + (p.paymentAmount || 0), 0
    );

    const receiptPayments = (receiptInput.payments || []).map((p: any, i: number, arr: any[]) => {
      const moneyTypeCode = paymentTypeMap[p.paymentType] ?? paymentTypeMap[p.moneyTypeCode] ?? 0;
      // If single payment, force to receiptTotal. If multiple, proportionally adjust last one.
      if (arr.length === 1) {
        return { moneyTypeCode, paymentAmount: receiptTotal };
      }
      // For multiple payments, keep the ratio but adjust the last one to make sum match
      const proportion = totalPaymentFromInput > 0 ? (p.paymentAmount / totalPaymentFromInput) : (1 / arr.length);
      const adjustedAmount = Number((receiptTotal * proportion).toFixed(2));
      return { moneyTypeCode, paymentAmount: adjustedAmount };
    });

    // Final correction: ensure sum of payments exactly equals receiptTotal (rounding fix)
    const totalPayments = receiptPayments.reduce((s: number, p: any) => s + p.paymentAmount, 0);
    if (receiptPayments.length > 0 && Math.abs(totalPayments - receiptTotal) > 0.001) {
      const diff = Number((receiptTotal - totalPayments).toFixed(2));
      receiptPayments[receiptPayments.length - 1].paymentAmount += diff;
      receiptPayments[receiptPayments.length - 1].paymentAmount = Number(
        receiptPayments[receiptPayments.length - 1].paymentAmount.toFixed(2)
      );
    }

    // Build the ZIMRA submit receipt request
    const zimraRequest = {
      receipt: {
        receiptGlobalNo,
        receiptCounter,
        receiptType,
        receiptCurrency: receiptInput.receiptCurrency || "USD",
        invoiceNo: receiptInput.invoiceNo || `INV-${receiptGlobalNo}`,
        externalReference: receiptInput.externalReference || `EXT-${Date.now()}`,
        receiptDate,
        operatorId: receiptInput.operatorId || "ADMIN",
        fiscalDayNo,
        ...(isFirstInFiscalDay ? {} : { previousReceiptHash }),
        receiptLinesTaxInclusive: receiptInput.receiptLinesTaxInclusive !== false,
        receiptLines,
        receiptTaxes,
        receiptPayments,
        receiptTotal,
        receiptPrintForm: "Receipt48",
        buyer: receiptInput.buyer,
      },
    };

    // Sign the canonical receipt line (spec §13.2.1) with the device ECDSA
    // P-256 private key. The SignatureData shape ZIMRA expects is
    // { hash, signature } where hash = SHA-256 of the canonical line.
    const signedPayload: any = { ...zimraRequest };
    try {
      const receiptDeviceSignature = signReceiptDevice(
        {
          deviceID,
          receiptType,
          receiptCurrency: receiptInput.receiptCurrency || "USD",
          receiptGlobalNo,
          receiptDate,
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
        deviceId: deviceID,
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

    // Submit to ZIMRA
    const zimraResponse = await submitReceipt(
      deviceID,
      deviceModelName || device.deviceModelName || "FiscalEdge",
      deviceModelVersion || device.deviceModelVersion || "1.0.0",
      device.certificate,
      privateKeyPem,
      signedPayload
    );

    // ZIMRA returns camelCase fields — normalize to handle both conventions
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

    // Determine status based on ZIMRA response. Any validation error color
    // (Red/Yellow/Grey) means the receipt was accepted with validation errors.
    const hasFiscalised = fdmsOpId && fdmsReceiptId;
    const hasValidationErrors = (fdmsValidationErrors?.length ?? 0) > 0;
    const receiptStatus = hasFiscalised
      ? hasValidationErrors
        ? "FDMS_ACCEPTED_WITH_VALIDATION_ERRORS"
        : "FISCALISED"
      : "SENT";

    // Save receipt to DB
    const [receipt] = await db
      .insert(receipts)
      .values({
        clientId,
        deviceId: device.id,
        shopId: receiptInput.shopId,
        fiscalDayNo,
        receiptGlobalNo,
        receiptCounter,
        receiptType: receiptInput.receiptType || "FISCALINVOICE",
        invoiceNo: zimraRequest.receipt.invoiceNo,
        externalReference: zimraRequest.receipt.externalReference,
        originalPayloadJson: JSON.stringify(receiptInput),
        fiscalPayloadJson: JSON.stringify(signedPayload),
        fdmsResponseJson: JSON.stringify(zimraResponse),
        fdmsOperationId: fdmsOpId,
        fdmsReceiptId: fdmsReceiptId,
        fdmsServerDate: fdmsServerDate ? new Date(fdmsServerDate) : undefined,
        fdmsServerSignatureHash: fdmsSignatureHash,
        fdmsServerSignature: fdmsSignature,
        fdmsServerSignatureThumbprint: fdmsThumbprint,
        fdmsValidationErrorsJson: fdmsValidationErrors
          ? JSON.stringify(fdmsValidationErrors)
          : undefined,
        status: receiptStatus,
        receivedAt: now,
        fiscalisedAt: hasFiscalised ? now : undefined,
        createdBy: "admin",
      })
      .returning();

    // Keep the open fiscal day's counters authoritative so closeDay sends the
    // correct receiptCounter and lastReceiptGlobalNo.
    if (openFiscalDay) {
      await db
        .update(fiscalDays)
        .set({
          lastReceiptGlobalNo: receiptGlobalNo,
          receiptCounter: receiptCounter,
          lastModifiedBy: "admin",
        })
        .where(eq(fiscalDays.id, openFiscalDay.id));
    }

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
