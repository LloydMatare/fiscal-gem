import { db } from "@/db";
import { receipts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyReceiptDeviceSignature } from "@/services/signing";

export interface LocalValidationError {
  validationErrorCode: string;
  message: string;
  validationErrorColor: "Red" | "Yellow" | "Grey";
  field?: string;
}

export interface LocalValidationResult {
  valid: boolean;
  errors: LocalValidationError[];
}

export interface LocalValidationContext {
  validTaxIds: Record<number, number>;
  certificatePem?: string;
  clientId?: string;
  deviceId?: number;
  authoritativeFiscalDayNo?: number | null;
  authoritativeFiscalDayStatus?: string | null;
  authoritativeLastReceiptGlobalNo?: number | null;
  openFiscalDayNo?: number | null;
  fiscalDayOpenedAt?: Date | null;
  taxpayerDayMaxHrs?: number | null;
  isVatPayer?: boolean;
  prevReceipt?: {
    receiptGlobalNo?: number | null;
    receiptCounter?: number | null;
    receiptDate?: string | null;
    fiscalDayNo?: number | null;
  } | null;
  serverNow?: Date;
}

const ISO_CURRENCIES = new Set([
  "AED","AFN","ALL","AMD","ANG","AOA","ARS","AUD","AWG","AZN","BAM","BBD","BDT","BGN",
  "BHD","BIF","BMD","BND","BOB","BOV","BRL","BSD","BTN","BWP","BYN","BZD","CAD","CDF",
  "CHE","CHF","CHW","CLF","CLP","CNY","COP","COU","CRC","CUC","CUP","CVE","CZK","DJF",
  "DKK","DOP","DZD","EGP","ERN","ETB","EUR","FJD","FKP","GBP","GEL","GHS","GIP","GMD",
  "GNF","GTQ","GYD","HKD","HNL","HRK","HTG","HUF","IDR","ILS","INR","IQD","IRR","ISK",
  "JMD","JOD","JPY","KES","KGS","KHR","KMF","KPW","KRW","KWD","KYD","KZT","LAK","LBP",
  "LKR","LRD","LSL","LYD","MAD","MDL","MGA","MKD","MMK","MNT","MOP","MRU","MUR","MVR",
  "MWK","MXN","MXV","MYR","MZN","NAD","NGN","NIO","NOK","NPR","NZD","OMR","PAB","PEN",
  "PGK","PHP","PKR","PLN","PYG","QAR","RON","RSD","RUB","RWF","SAR","SBD","SCR","SDG",
  "SEK","SGD","SHP","SLL","SOS","SRD","SSP","STN","SVC","SYP","SZL","THB","TJS","TMT",
  "TND","TOP","TRY","TTD","TWD","TZS","UAH","UGX","USD","USN","UYI","UYU","UYW","UZS",
  "VES","VND","VUV","WST","XAF","XCD","XOF","XPF","YER","ZAR","ZMW","ZWL",
]);

export function normalizeReceiptType(type: string | undefined): string {
  if (!type) return "FISCALINVOICE";
  return type.toUpperCase().replace(/_/g, "");
}

export function buildLocalValidationContext(input: {
  validTaxIds: Record<number, number>;
  certificatePem?: string;
  clientId?: string;
  deviceId?: number;
  fiscalDay?: { fiscalDayOpened?: Date | null; fiscalDayNo?: number | null } | null;
  deviceConfig?: { taxpayerDayMaxHrs?: number | null; vatNumber?: string | null } | null;
  lastReceipt?: {
    receiptGlobalNo?: number | null;
    receiptCounter?: number | null;
    fiscalDayNo?: number | null;
    fiscalPayloadJson?: string | null;
  } | null;
  authoritativeFiscalDayNo?: number | null;
  authoritativeFiscalDayStatus?: string | null;
  authoritativeLastReceiptGlobalNo?: number | null;
  serverNow?: Date;
}): LocalValidationContext {
  let prevDate: string | null = null;
  if (input.lastReceipt?.fiscalPayloadJson) {
    try {
      const payload = JSON.parse(input.lastReceipt.fiscalPayloadJson);
      prevDate = payload?.receipt?.receiptDate ?? null;
    } catch {}
  }

  return {
    validTaxIds: input.validTaxIds,
    certificatePem: input.certificatePem,
    clientId: input.clientId,
    deviceId: input.deviceId,
    authoritativeFiscalDayNo: input.authoritativeFiscalDayNo,
    authoritativeFiscalDayStatus: input.authoritativeFiscalDayStatus,
    authoritativeLastReceiptGlobalNo: input.authoritativeLastReceiptGlobalNo,
    openFiscalDayNo: input.fiscalDay?.fiscalDayNo ?? null,
    fiscalDayOpenedAt: input.fiscalDay?.fiscalDayOpened ?? null,
    taxpayerDayMaxHrs: input.deviceConfig?.taxpayerDayMaxHrs ?? null,
    isVatPayer: input.deviceConfig ? !!input.deviceConfig.vatNumber : true,
    prevReceipt: input.lastReceipt
      ? {
          receiptGlobalNo: input.lastReceipt.receiptGlobalNo,
          receiptCounter: input.lastReceipt.receiptCounter,
          receiptDate: prevDate,
          fiscalDayNo: input.lastReceipt.fiscalDayNo ?? null,
        }
      : null,
    serverNow: input.serverNow ?? new Date(),
  };
}

export async function validateReceiptForZimra(
  receipt: any,
  ctx: LocalValidationContext
): Promise<LocalValidationResult> {
  const errors: LocalValidationError[] = [];

  const add = (
    code: string,
    message: string,
    color: "Red" | "Yellow" | "Grey",
    field?: string
  ) => {
    errors.push({ validationErrorCode: code, message, validationErrorColor: color, field });
  };

  if (!receipt || typeof receipt !== "object") {
    return { valid: false, errors: [{ validationErrorCode: "RCPT000", message: "Receipt payload is missing or malformed", validationErrorColor: "Red" }] };
  }

  const type = normalizeReceiptType(receipt.receiptType);
  const isCreditNote = type === "CREDITNOTE";
  const isDebitNote = type === "DEBITNOTE";
  const isCreditOrDebit = isCreditNote || isDebitNote;
  const isTaxInclusive = receipt.receiptLinesTaxInclusive !== false;
  const receiptDate = new Date(receipt.receiptDate);
  const validDate = !Number.isNaN(receiptDate.getTime());

  // --- RCPT010: currency must be valid ---
  const currency = (receipt.receiptCurrency || "").toUpperCase();
  if (!currency || !ISO_CURRENCIES.has(currency)) {
    add("RCPT010", `Currency ${receipt.receiptCurrency || "(empty)"} is not a valid ISO 4217 currency code`, "Red", "receipt.receiptCurrency");
  }

  // --- RCPT016/017/018: mandatory sections ---
  const lines = Array.isArray(receipt.receiptLines) ? receipt.receiptLines : [];
  if (lines.length === 0) {
    add("RCPT016", "No receipt lines provided", "Red", "receipt.receiptLines");
  }
  const taxes = Array.isArray(receipt.receiptTaxes) ? receipt.receiptTaxes : [];
  if (taxes.length === 0) {
    add("RCPT017", "Taxes information is not provided", "Red", "receipt.receiptTaxes");
  }
  const payments = Array.isArray(receipt.receiptPayments) ? receipt.receiptPayments : [];
  if (payments.length === 0) {
    add("RCPT018", "Payment information is not provided", "Red", "receipt.receiptPayments");
  }

  const receiptTotal = Number(receipt.receiptTotal);

  // --- RCPT022/023/024/025: line checks ---
  const linesSum = lines.reduce((sum: number, l: any) => {
    let lineSum = sum;
    const price = Number(l.receiptLinePrice);
    const qty = Number(l.receiptLineQuantity);
    const lineTotal = Number(l.receiptLineTotal);
    const lineType = (l.receiptLineType || "Sale").toLowerCase();
    const hsCode = l.receiptLineHSCode;

    // RCPT022 price sign rules
    if (Number.isFinite(price)) {
      if (lineType === "sale") {
        if (isCreditNote && price >= 0) {
          add("RCPT022", `Line ${l.receiptLineNo}: sales line price must be less than 0 for Credit Note`, "Red", `receiptLines[${l.receiptLineNo}]`);
        } else if (!isCreditNote && price <= 0) {
          add("RCPT022", `Line ${l.receiptLineNo}: sales line price must be greater than 0 for Invoice/Debit Note`, "Red", `receiptLines[${l.receiptLineNo}]`);
        }
      } else if (lineType === "discount" && !isCreditNote && price >= 0) {
        add("RCPT022", `Line ${l.receiptLineNo}: discount line price must be less than 0 for Invoice`, "Red", `receiptLines[${l.receiptLineNo}]`);
      }
    }

    // RCPT023 quantity
    if (!Number.isFinite(qty) || qty <= 0) {
      add("RCPT023", `Line ${l.receiptLineNo}: quantity must be positive`, "Red", `receiptLines[${l.receiptLineNo}].receiptLineQuantity`);
    }

    // RCPT024 line total = price * qty
    if (Number.isFinite(price) && Number.isFinite(qty) && Number.isFinite(lineTotal)) {
      const expected = Number((price * qty).toFixed(2));
      if (Math.abs(lineTotal - expected) > 0.01) {
        add("RCPT024", `Line ${l.receiptLineNo}: line total ${lineTotal} is not equal to unit price * quantity (${expected})`, "Red", `receiptLines[${l.receiptLineNo}].receiptLineTotal`);
      }
    }

    // RCPT025 tax validity
    const lineTaxId = Number(l.taxID);
    const validTaxIds = Object.values(ctx.validTaxIds);
    if (!Number.isFinite(lineTaxId) || validTaxIds.length === 0 || !validTaxIds.includes(lineTaxId)) {
      add("RCPT025", `Invalid tax ID ${l.taxID} used on line ${l.receiptLineNo}. Allowed tax IDs: ${validTaxIds.join(", ")}`, "Red", `receiptLines[${l.receiptLineNo}].taxID`);
    }

    // RCPT021: VAT used while not a VAT taxpayer
    const lineTaxPercent = l.taxPercent !== undefined ? Number(l.taxPercent) : null;
    if (ctx.isVatPayer === false && lineTaxPercent !== null && lineTaxPercent > 0) {
      add("RCPT021", `Line ${l.receiptLineNo}: VAT tax (${lineTaxPercent}%) is used while taxpayer is not a VAT payer`, "Red", `receiptLines[${l.receiptLineNo}].taxPercent`);
    }

    // RCPT047/048: HS code requirements
    if (ctx.isVatPayer && !hsCode) {
      add("RCPT047", `Line ${l.receiptLineNo}: HS code must be provided for VAT payer`, "Red", `receiptLines[${l.receiptLineNo}].receiptLineHSCode`);
    } else if (hsCode) {
      const digits = String(hsCode).replace(/\D/g, "");
      if (![4, 8].includes(digits.length)) {
        add("RCPT048", `Line ${l.receiptLineNo}: HS code length must be 4 or 8 digits`, "Red", `receiptLines[${l.receiptLineNo}].receiptLineHSCode`);
      }
    }

    if (Number.isFinite(lineTotal)) lineSum += lineTotal;
    return lineSum;
  }, 0);

  // --- RCPT025/026/027: tax table checks ---
  const validTaxIds = Object.values(ctx.validTaxIds);
  for (const t of taxes) {
    const taxId = Number(t.taxID);
    if (!Number.isFinite(taxId) || validTaxIds.length === 0 || !validTaxIds.includes(taxId)) {
      add("RCPT025", `Invalid tax ID ${t.taxID} used in taxes table. Allowed tax IDs: ${validTaxIds.join(", ")}`, "Red", `receipt.receiptTaxes`);
    }

    const taxPercent = t.taxPercent !== undefined ? Number(t.taxPercent) : null;
    if (ctx.isVatPayer === false && taxPercent !== null && taxPercent > 0) {
      add("RCPT021", `VAT tax (${taxPercent}%) is used in taxes table while taxpayer is not a VAT payer`, "Red", `receipt.receiptTaxes`);
    }

    if (taxPercent !== null) {
      const matchingLines = lines.filter((l: any) => Number(l.taxID) === taxId);
      const groupTotal = matchingLines.reduce((s: number, l: any) => s + (Number(l.receiptLineTotal) || 0), 0);
      const expectedTax = isTaxInclusive
        ? Number((groupTotal * taxPercent / (100 + taxPercent)).toFixed(2))
        : Number((groupTotal * taxPercent / 100).toFixed(2));
      const taxAmount = Number(t.taxAmount);
      if (Number.isFinite(taxAmount) && Math.abs(taxAmount - expectedTax) > 0.02) {
        add("RCPT026", `Tax amount for taxID ${taxId} (${taxAmount}) is not equal to the expected amount (${expectedTax})`, "Red", `receipt.receiptTaxes`);
      }
      const expectedSales = isTaxInclusive
        ? Number(groupTotal.toFixed(2))
        : Number((groupTotal * (100 + taxPercent) / 100).toFixed(2));
      const salesAmount = Number(t.salesAmountWithTax);
      if (Number.isFinite(salesAmount) && Math.abs(salesAmount - expectedSales) > 0.02) {
        add("RCPT027", `Sales amount with tax for taxID ${taxId} (${salesAmount}) is not equal to the expected amount (${expectedSales})`, "Red", `receipt.receiptTaxes`);
      }
    }
  }

  // --- RCPT019/RCPT037/RCPT038: totals ---
  if (Number.isFinite(receiptTotal)) {
    if (isTaxInclusive) {
      const linesTotal = Number(linesSum.toFixed(2));
      if (Math.abs(receiptTotal - linesTotal) > 0.01) {
        add("RCPT019", `Invoice total ${receiptTotal} is not equal to the sum of all invoice lines (${linesTotal})`, "Red", "receipt.receiptTotal");
      }
    } else {
      const taxSum = taxes.reduce((s: number, t: any) => s + (Number(t.taxAmount) || 0), 0);
      const expectedTotal = Number((linesSum + taxSum).toFixed(2));
      if (Math.abs(receiptTotal - expectedTotal) > 0.01) {
        add("RCPT037", `Invoice total ${receiptTotal} is not equal to the sum of all invoice lines and taxes applied (${expectedTotal})`, "Red", "receipt.receiptTotal");
      }
    }
    const salesTaxSum = taxes.reduce((s: number, t: any) => s + (Number(t.salesAmountWithTax) || 0), 0);
    const salesTotal = Number(salesTaxSum.toFixed(2));
    if (Math.abs(receiptTotal - salesTotal) > 0.01) {
      add("RCPT038", `Invoice total ${receiptTotal} is not equal to the sum of sales amount including tax (${salesTotal})`, "Red", "receipt.receiptTotal");
    }

    // RCPT040
    if (isCreditNote && receiptTotal > 0) {
      add("RCPT040", "Invoice total must be less than or equal to 0 for Credit Note", "Red", "receipt.receiptTotal");
    } else if (!isCreditNote && receiptTotal < 0) {
      add("RCPT040", "Invoice total must be greater than or equal to 0 for Invoice/Debit Note", "Red", "receipt.receiptTotal");
    }
  } else {
    add("RCPT019", "receiptTotal must be a number", "Red", "receipt.receiptTotal");
  }

  // --- RCPT039: total = sum of payments ---
  if (payments.length > 0) {
    const totalPayments = payments.reduce(
      (sum: number, p: any) => sum + (Number.isFinite(Number(p.paymentAmount)) ? Number(p.paymentAmount) : 0),
      0
    );
    if (Number.isFinite(receiptTotal) && Math.abs(totalPayments - receiptTotal) > 0.01) {
      add("RCPT039", `Invoice total ${receiptTotal} is not equal to the sum of all payment amounts (${Number(totalPayments.toFixed(2))})`, "Red", "receipt.receiptPayments");
    }

    // RCPT028 payment sign
    for (const p of payments) {
      const amount = Number(p.paymentAmount);
      if (isCreditNote && amount > 0) {
        add("RCPT028", "Payment amount must be less than or equal to 0 for Credit Note", "Red", "receipt.receiptPayments");
      } else if (!isCreditNote && amount < 0) {
        add("RCPT028", "Payment amount must be greater than or equal to 0 for Invoice/Debit Note", "Red", "receipt.receiptPayments");
      }
    }
  }

  // --- RCPT014/030/031/041: receipt date checks ---
  if (validDate) {
    if (ctx.fiscalDayOpenedAt && receiptDate.getTime() < ctx.fiscalDayOpenedAt.getTime()) {
      add("RCPT014", "Receipt date is earlier than the fiscal day opening date", "Yellow", "receipt.receiptDate");
    }

    const prevDate = ctx.prevReceipt?.receiptDate ? new Date(ctx.prevReceipt.receiptDate) : null;
    if (prevDate && !Number.isNaN(prevDate.getTime()) && receiptDate.getTime() < prevDate.getTime()) {
      add("RCPT030", "Receipt date is earlier than the previously submitted receipt date", "Red", "receipt.receiptDate");
    }

    const now = ctx.serverNow ?? new Date();
    const maxFutureSkew = 5 * 60 * 1000; // 5 min tolerance
    if (receiptDate.getTime() > now.getTime() + maxFutureSkew) {
      add("RCPT031", "Invoice is submitted with a future date", "Yellow", "receipt.receiptDate");
    }

    if (ctx.fiscalDayOpenedAt && ctx.taxpayerDayMaxHrs) {
      const dayEnd = new Date(ctx.fiscalDayOpenedAt.getTime() + ctx.taxpayerDayMaxHrs * 60 * 60 * 1000);
      if (receiptDate.getTime() > dayEnd.getTime()) {
        add("RCPT041", "Invoice is issued after the fiscal day end", "Yellow", "receipt.receiptDate");
      }
    }
  } else {
    add("RCPT014", "receiptDate must be a valid date", "Red", "receipt.receiptDate");
  }

  // --- RCPT041: fiscal day mismatch ---
  if (ctx.authoritativeFiscalDayNo && receipt.fiscalDayNo !== ctx.authoritativeFiscalDayNo) {
    add(
      "RCPT041",
      `Receipt fiscal day ${receipt.fiscalDayNo} does not match the current fiscal day ${ctx.authoritativeFiscalDayNo} on ZIMRA. Fiscal day may have been closed.`,
      "Yellow",
      "receipt.fiscalDayNo"
    );
  } else if (
    !ctx.authoritativeFiscalDayNo &&
    ctx.openFiscalDayNo &&
    receipt.fiscalDayNo !== ctx.openFiscalDayNo
  ) {
    add(
      "RCPT041",
      `Receipt fiscal day ${receipt.fiscalDayNo} does not match the local open fiscal day ${ctx.openFiscalDayNo}. Open a new fiscal day before submitting.`,
      "Yellow",
      "receipt.fiscalDayNo"
    );
  }

  if (ctx.authoritativeFiscalDayStatus) {
    const status = String(ctx.authoritativeFiscalDayStatus).toUpperCase();
    const submittable = status.includes("OPEN") || status.includes("CLOSE_FAILED") || status.includes("CLOSEFAILED");
    if (!submittable) {
      add(
        "RCPT01",
        `Submitting receipt is not allowed. Fiscal day status is ${ctx.authoritativeFiscalDayStatus}`,
        "Red",
        "fiscalDay"
      );
    }
  }

  // --- RCPT020: device signature over the canonical §13.2.1 concatenation ---
  const signature = receipt.receiptDeviceSignature;
  if (!signature || !signature.signature) {
    add("RCPT020", "Receipt device signature is missing", "Red", "receipt.receiptDeviceSignature");
  } else if (ctx.certificatePem && ctx.deviceId != null) {
    const verifyResult = verifyReceiptDeviceSignature(
      {
        deviceID: ctx.deviceId,
        receiptType: receipt.receiptType,
        receiptCurrency: receipt.receiptCurrency,
        receiptGlobalNo: Number(receipt.receiptGlobalNo),
        receiptDate: receipt.receiptDate,
        receiptTotal: Number(receipt.receiptTotal),
        receiptTaxes: Array.isArray(receipt.receiptTaxes) ? receipt.receiptTaxes : [],
        previousReceiptHash: receipt.previousReceiptHash,
        isFirstInFiscalDay: Number(receipt.receiptCounter) === 1,
      },
      signature,
      ctx.certificatePem
    );
    if (!verifyResult.valid) {
      add("RCPT020", `Receipt device signature is invalid: ${verifyResult.reason}`, "Red", "receipt.receiptDeviceSignature");
    }
  }

  // --- RCPT011/012: receipt chain ---
  const prev = ctx.prevReceipt;
  const counter = Number(receipt.receiptCounter);
  const globalNo = Number(receipt.receiptGlobalNo);

  // Receipt counter is fiscal-day scoped: it only continues from a previous
  // receipt in the SAME fiscal day, otherwise it must reset to 1.
  const prevInSameDay = !!(
    prev && prev.fiscalDayNo != null && Number(receipt.fiscalDayNo) === prev.fiscalDayNo
  );
  if (prevInSameDay) {
    if (counter !== Number(prev!.receiptCounter) + 1) {
      add("RCPT011", `Receipt counter ${counter} is not sequential. Expected ${Number(prev!.receiptCounter) + 1}`, "Red", "receipt.receiptCounter");
    }
  } else if (counter !== 1) {
    add("RCPT011", `Receipt counter must be 1 for the first receipt in a fiscal day (got ${counter})`, "Red", "receipt.receiptCounter");
  }

  // Receipt global number must follow ZIMRA's authoritative last receipt number
  // when known, otherwise the previous local receipt.
  const expectedGlobal = ctx.authoritativeLastReceiptGlobalNo != null
    ? Number(ctx.authoritativeLastReceiptGlobalNo) + 1
    : prev?.receiptGlobalNo
      ? Number(prev.receiptGlobalNo) + 1
      : 1;
  if (globalNo !== expectedGlobal) {
    add("RCPT012", `Receipt global number ${globalNo} is not sequential. Expected ${expectedGlobal}`, "Red", "receipt.receiptGlobalNo");
  }

  // --- RCPT013: invoice number uniqueness ---
  if (ctx.clientId && receipt.invoiceNo) {
    try {
      const existing = await db.query.receipts.findFirst({
        where: and(
          eq(receipts.clientId, ctx.clientId),
          eq(receipts.invoiceNo, receipt.invoiceNo)
        ),
      });
      if (existing) {
        add("RCPT013", `Invoice number ${receipt.invoiceNo} is not unique`, "Red", "receipt.invoiceNo");
      }
    } catch (e) {
      console.warn("Could not check invoice uniqueness:", e);
    }
  }

  // --- RCPT015/029/034: credit/debit note rules ---
  if (isCreditOrDebit) {
    if (!receipt.creditDebitNote) {
      add("RCPT015", "Credited/debited invoice data is not provided", "Red", "receipt.creditDebitNote");
    }
    if (!receipt.receiptNotes) {
      add("RCPT034", "Note for credit/debit note is not provided", "Red", "receipt.receiptNotes");
    }
  } else if (receipt.creditDebitNote) {
    add("RCPT029", "Credited/debited invoice information provided for a regular invoice", "Red", "receipt.creditDebitNote");
  }

  // --- RCPT043: buyer data ---
  if (receipt.buyer && typeof receipt.buyer === "object") {
    const hasAnyBuyerField = Object.values(receipt.buyer).some((v) => v !== undefined && v !== null && v !== "");
    if (hasAnyBuyerField) {
      const b = receipt.buyer as Record<string, unknown>;
      const name = b.buyerRegisterName ?? b.name ?? b.buyerName;
      const tin = b.buyerTIN ?? b.tin;
      if (!name || !tin) {
        add("RCPT043", "Buyer register name and buyer TIN must be provided when buyer data is sent", "Red", "receipt.buyer");
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
