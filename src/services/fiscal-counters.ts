import { db } from "@/db";
import { receipts } from "@/db/schema";
import { eq, and, notInArray } from "drizzle-orm";
import crypto from "crypto";
import type { FiscalCounterEntry } from "@/integration/zimra/device";
import { normalizeReceiptType } from "@/lib/zimra-local-validation";
import { amountToCents } from "./signing";

/**
 * ZIMRA Fiscal Device Gateway API v7.2, section 6 "Fiscal counters".
 *
 * Fiscal day counters are reset after fiscal day close and start from zero on
 * each new fiscal day. Each counter below is accumulated during the fiscal day
 * from the receipts submitted to ZIMRA, grouped by tax (taxID + taxPercent),
 * currency and/or payment method:
 *
 *   SaleByTax             total sales (after discount) incl. tax, per tax & currency
 *   SaleTaxByTax          total tax from sales, per tax & currency
 *   CreditNoteByTax       total credit notes incl. tax, per tax & currency (negative)
 *   CreditNoteTaxByTax    total tax from credit notes, per tax & currency (negative)
 *   DebitNoteByTax        total debit notes incl. tax, per tax & currency
 *   DebitNoteTaxByTax     total tax from debit notes, per tax & currency
 *   BalanceByMoneyType    total collected/paid, per payment method & currency
 *
 * A counter is optional to send when its value is zero. Credit note counters
 * are accumulated with a negative sign. Exempt lines carry no taxPercent.
 */

const FISCAL_COUNTER_TYPE_ORDER: Record<string, number> = {
  SaleByTax: 0,
  SaleTaxByTax: 1,
  CreditNoteByTax: 2,
  CreditNoteTaxByTax: 3,
  DebitNoteByTax: 4,
  DebitNoteTaxByTax: 5,
  BalanceByMoneyType: 6,
};

// Spec 5.4.5 MoneyType enum: enum value (string) at its enum order (numeric).
const MONEY_TYPE_NAME_BY_CODE: Record<number, string> = {
  0: "Cash",
  1: "Card",
  2: "MobileWallet",
  3: "Coupon",
  4: "Credit",
  5: "BankTransfer",
  6: "Other",
};

function toMoneyTypeName(code: number | string | undefined): string {
  if (typeof code === "string" && !/^\d+$/.test(code)) return code;
  const n = Number(code);
  return MONEY_TYPE_NAME_BY_CODE[n] ?? String(code ?? 0);
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

interface ByTaxAcc {
  saleType: string;
  taxType: string;
  currency: string;
  taxID: number;
  taxPercent?: number;
  salesAmountWithTax: number;
  taxAmount: number;
}

interface MoneyAcc {
  currency: string;
  moneyType: string;
  amount: number;
}

interface ReceiptTaxEntry {
  taxID?: number;
  taxPercent?: number;
  taxAmount?: number;
  salesAmountWithTax?: number;
}

interface ReceiptPaymentEntry {
  moneyTypeCode?: number | string;
  paymentAmount?: number;
}

interface FiscalReceipt {
  receipt?: {
    receiptType?: string;
    receiptCurrency?: string;
    receiptTaxes?: ReceiptTaxEntry[];
    receiptPayments?: ReceiptPaymentEntry[];
  };
}

function parseReceiptPayload(payload: string): unknown | null {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Computes the section-6 fiscal day counters from the fiscal payloads of the
 * receipts issued during one fiscal day. Non-zero counters only.
 */
export function buildFiscalDayCounters(
  receiptPayloads: unknown[]
): FiscalCounterEntry[] {
  const byTax = new Map<string, ByTaxAcc>();
  const byMoney = new Map<string, MoneyAcc>();

  for (const raw of receiptPayloads) {
    const receipt = (raw as FiscalReceipt | null)?.receipt;
    if (!receipt) continue;

    const type = normalizeReceiptType(receipt.receiptType);
    // Credit note counters decrease (spec footnote to the counter table).
    const sign = type === "CREDITNOTE" ? -1 : 1;

    const isCredit = type === "CREDITNOTE";
    const saleType = isCredit
      ? "CreditNoteByTax"
      : type === "DEBITNOTE"
        ? "DebitNoteByTax"
        : "SaleByTax";
    const taxType = isCredit
      ? "CreditNoteTaxByTax"
      : type === "DEBITNOTE"
        ? "DebitNoteTaxByTax"
        : "SaleTaxByTax";

    const currency = (receipt.receiptCurrency as string) || "USD";

    for (const t of receipt.receiptTaxes ?? []) {
      const taxID = t.taxID ?? 0;
      const taxPercent: number | undefined = t.taxPercent;
      const key = `${saleType}|${currency}|${taxID}|${taxPercent ?? ""}`;
      let acc = byTax.get(key);
      if (!acc) {
        acc = {
          saleType,
          taxType,
          currency,
          taxID,
          ...(taxPercent !== undefined ? { taxPercent } : {}),
          salesAmountWithTax: 0,
          taxAmount: 0,
        };
        byTax.set(key, acc);
      }
      acc.salesAmountWithTax += sign * (t.salesAmountWithTax ?? 0);
      acc.taxAmount += sign * (t.taxAmount ?? 0);
    }

    for (const p of receipt.receiptPayments ?? []) {
      const moneyType = toMoneyTypeName(p.moneyTypeCode);
      const key = `${currency}|${moneyType}`;
      let acc = byMoney.get(key);
      if (!acc) {
        acc = { currency, moneyType, amount: 0 };
        byMoney.set(key, acc);
      }
      acc.amount += sign * (p.paymentAmount ?? 0);
    }
  }

  const counters: FiscalCounterEntry[] = [];

  for (const acc of byTax.values()) {
    if (acc.salesAmountWithTax !== 0) {
      counters.push({
        fiscalCounterType: acc.saleType,
        fiscalCounterCurrency: acc.currency,
        fiscalCounterTaxID: acc.taxID,
        ...(acc.taxPercent !== undefined
          ? { fiscalCounterTaxPercent: acc.taxPercent }
          : {}),
        fiscalCounterValue: round2(acc.salesAmountWithTax),
      });
    }
    if (acc.taxAmount !== 0) {
      counters.push({
        fiscalCounterType: acc.taxType,
        fiscalCounterCurrency: acc.currency,
        fiscalCounterTaxID: acc.taxID,
        ...(acc.taxPercent !== undefined
          ? { fiscalCounterTaxPercent: acc.taxPercent }
          : {}),
        fiscalCounterValue: round2(acc.taxAmount),
      });
    }
  }

  for (const acc of byMoney.values()) {
    if (acc.amount !== 0) {
      counters.push({
        fiscalCounterType: "BalanceByMoneyType",
        fiscalCounterCurrency: acc.currency,
        fiscalCounterMoneyType: acc.moneyType,
        fiscalCounterValue: round2(acc.amount),
      });
    }
  }

  // Deterministic order: counter type (asc), then currency, then taxID/moneyType.
  counters.sort((a, b) => {
    const ta = FISCAL_COUNTER_TYPE_ORDER[a.fiscalCounterType ?? ""] ?? 99;
    const tb = FISCAL_COUNTER_TYPE_ORDER[b.fiscalCounterType ?? ""] ?? 99;
    if (ta !== tb) return ta - tb;
    const ca = a.fiscalCounterCurrency ?? "";
    const cb = b.fiscalCounterCurrency ?? "";
    if (ca !== cb) return ca.localeCompare(cb);
    const ia: number | string =
      a.fiscalCounterTaxID ?? a.fiscalCounterMoneyType ?? "";
    const ib: number | string =
      b.fiscalCounterTaxID ?? b.fiscalCounterMoneyType ?? "";
    if (typeof ia === "string" || typeof ib === "string") {
      return String(ia).localeCompare(String(ib));
    }
    return ia - ib;
  });

  return counters;
}

/**
 * Loads the fiscal payloads of the receipts issued on one fiscal day (excluding
 * failed/cancelled/pending-retry receipts, which never entered ZIMRA's totals).
 */
export async function loadFiscalDayReceiptPayloads(params: {
  clientId: string;
  deviceUuid: string;
  fiscalDayNo: number;
}): Promise<unknown[]> {
  const rows = await db.query.receipts.findMany({
    where: and(
      eq(receipts.clientId, params.clientId),
      eq(receipts.deviceId, params.deviceUuid),
      eq(receipts.fiscalDayNo, params.fiscalDayNo),
      notInArray(receipts.status, ["FAILED", "CANCELLED", "RETRY_PENDING"])
    ),
    columns: { fiscalPayloadJson: true },
  });

  const payloads: unknown[] = [];
  for (const row of rows) {
    const parsed = parseReceiptPayload(row.fiscalPayloadJson);
    if (parsed) payloads.push(parsed);
  }
  return payloads;
}

/**
 * Formats one fiscal day counter as a line for the fiscal day signature
 * concatenation (spec 13.3.1):
 *   fiscalCounterType || fiscalCounterCurrency || (fiscalCounterTaxPercent as
 *   xx.xx OR fiscalCounterMoneyType, upper case) || fiscalCounterValue in cents
 *
 * All text is upper case; amounts are cents without a decimal dot; exempt
 * counters (no taxPercent) contribute an empty middle segment.
 */
export function formatFiscalCounterLine(counter: FiscalCounterEntry): string {
  const type = (counter.fiscalCounterType ?? "").toUpperCase();
  const currency = (counter.fiscalCounterCurrency ?? "").toUpperCase();
  let middle = "";
  if (counter.fiscalCounterTaxPercent !== undefined) {
    middle = counter.fiscalCounterTaxPercent.toFixed(2);
  } else if (counter.fiscalCounterMoneyType) {
    middle = String(counter.fiscalCounterMoneyType).toUpperCase();
  }
  return `${type}${currency}${middle}${amountToCents(
    counter.fiscalCounterValue ?? 0
  )}`;
}

/**
 * Generates the fiscal day device signature per spec 13.3.1 using the device
 * private key. Hash fields in order:
 *   deviceID || fiscalDayNo || fiscalDayDate(YYYY-MM-DD, day opened) ||
 *   fiscalDayCounters (concatenated non-zero lines, sorted as in the request)
 *
 * Returns the SignatureData ZIMRA expects in closeDay: SHA-256 of the line
 * (base64) plus an ECDSA-SHA256 signature over the line (base64).
 */
export function buildFiscalDayDeviceSignature(input: {
  deviceID: number;
  fiscalDayNo: number;
  fiscalDayOpened: Date;
  fiscalDayCounters: FiscalCounterEntry[];
  privateKeyPem: string;
}): { hash: string; signature: string } {
  const pad = (v: number) => String(v).padStart(2, "0");
  const d = input.fiscalDayOpened;
  const fiscalDayDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}`;

  const countersLine = input.fiscalDayCounters
    .map(formatFiscalCounterLine)
    .join("");
  const line =
    `${String(input.deviceID)}${String(input.fiscalDayNo)}${fiscalDayDate}` +
    countersLine;

  const hash = crypto.createHash("sha256").update(line, "utf-8").digest("base64");
  const privateKey = crypto.createPrivateKey(input.privateKeyPem);
  const signature = crypto.sign(
    "sha256",
    Buffer.from(line, "utf-8"),
    { key: privateKey }
  );

  return { hash, signature: signature.toString("base64") };
}
