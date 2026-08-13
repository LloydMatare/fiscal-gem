import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { receipts } from "@/db/schema";
import { getReceiptDeviceHash } from "./signing";

export interface LocalLastReceipt {
  receiptGlobalNo: number | null;
  receiptCounter: number | null;
  fiscalDayNo: number | null;
  fiscalPayloadJson: string | null;
}

export interface ResolveReceiptSequenceParams {
  clientId: string;
  deviceUuid: string;
  zimraLastReceiptGlobalNo: number | null | undefined;
  zimraReachable: boolean;
  localLastReceipt: LocalLastReceipt | null | undefined;
  openFiscalDayNo: number | null;
}

export type ResolveReceiptSequenceResult =
  | {
      ok: true;
      receiptGlobalNo: number;
      receiptCounter: number;
      isFirstInFiscalDay: boolean;
      previousReceiptHash?: string;
    }
  | {
      ok: false;
      errors: string[];
    };

/**
 * Finds numbers missing from the locally-recorded receipt global sequence up to
 * `upto`. A gap means receipts either reached ZIMRA (or were allocated) without
 * being persisted locally, so the local chain has diverged from ZIMRA and any
 * submit would trigger RCPT012 "Receipt global number is not sequential".
 */
async function findMissingGlobalNumbers(
  clientId: string,
  deviceUuid: string,
  upto: number
): Promise<number[]> {
  if (upto < 2) return [];
  const rows = await db
    .select({ n: receipts.receiptGlobalNo })
    .from(receipts)
    .where(
      and(
        eq(receipts.clientId, clientId),
        eq(receipts.deviceId, deviceUuid),
        isNotNull(receipts.receiptGlobalNo)
      )
    )
    .orderBy(asc(receipts.receiptGlobalNo));

  const present = new Set(
    rows.map((r) => r.n).filter((n): n is number => n != null)
  );
  const missing: number[] = [];
  for (let i = 1; i <= upto; i++) {
    if (!present.has(i)) missing.push(i);
  }
  return missing;
}

/**
 * Resolves the next receipt global number and fiscal-day-scoped counter before
 * submitting to ZIMRA.
 *
 * ZIMRA's GetStatus `lastReceiptGlobalNo` is the authoritative source for the
 * next global number (RCPT012: next must be last+1). Local state is only used to
 * detect divergence, never to assign the number:
 *  - If GetStatus is unreachable we refuse to assign (no fallback to local max,
 *    which is exactly what causes drift).
 *  - If the locally-recorded global sequence has gaps, or local max disagrees
 *    with ZIMRA, we fail with a reconciliation error instead of sending a number
 *    ZIMRA will flag as non-sequential.
 */
export async function resolveReceiptSequence(
  params: ResolveReceiptSequenceParams
): Promise<ResolveReceiptSequenceResult> {
  if (!params.zimraReachable || params.zimraLastReceiptGlobalNo == null) {
    return {
      ok: false,
      errors: [
        "ZIMRA GetStatus is unreachable — refusing to assign receiptGlobalNo from local state (would risk RCPT012 drift). Retry once ZIMRA is reachable.",
      ],
    };
  }

  const expectedGlobal = params.zimraLastReceiptGlobalNo + 1;
  const errors: string[] = [];

  const missing = await findMissingGlobalNumbers(
    params.clientId,
    params.deviceUuid,
    expectedGlobal - 1
  );
  if (missing.length > 0) {
    errors.push(
      `Receipt global sequence has gaps locally: ${missing.join(
        ", "
      )} are missing but ZIMRA's last receipt global number is ${
        params.zimraLastReceiptGlobalNo
      }. Reconcile/backfill these receipts before submitting, otherwise ZIMRA will return RCPT012.`
    );
  }

  const localLast = params.localLastReceipt ?? null;
  const localNextGlobal = (localLast?.receiptGlobalNo ?? 0) + 1;
  if (
    localLast?.receiptGlobalNo != null &&
    localNextGlobal !== expectedGlobal
  ) {
    errors.push(
      `Receipt global number drift: ZIMRA expects next global ${expectedGlobal}, but local records imply ${localNextGlobal}.`
    );
  }

  if (errors.length > 0) return { ok: false, errors };

  const prevInSameDay = !!(
    params.openFiscalDayNo != null &&
    localLast &&
    localLast.fiscalDayNo != null &&
    localLast.fiscalDayNo === params.openFiscalDayNo
  );
  const receiptCounter = prevInSameDay
    ? (localLast!.receiptCounter ?? 0) + 1
    : 1;
  const isFirstInFiscalDay = receiptCounter === 1;
  const previousReceiptHash =
    prevInSameDay && localLast?.fiscalPayloadJson
      ? getReceiptDeviceHash(localLast.fiscalPayloadJson)
      : undefined;

  return {
    ok: true,
    receiptGlobalNo: expectedGlobal,
    receiptCounter,
    isFirstInFiscalDay,
    previousReceiptHash,
  };
}
