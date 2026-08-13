import { db } from "@/db";
import { fiscalDays } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { GetStatusResponse } from "@/integration/zimra/device";

interface SyncFiscalDayParams {
  clientId: string;
  deviceDbId: string;
  zimraStatus: GetStatusResponse | null | undefined;
  userId?: string | null;
}

/**
 * Reconciles the locally-tracked open fiscal day with the authoritative
 * status returned by ZIMRA.
 *
 * - ZIMRA says a day is open but we have none -> insert it.
 * - ZIMRA says the day is closed but we still have an OPENED row -> close it.
 *
 * Returns the currently-open fiscal day (or null when ZIMRA reports it closed).
 */
export async function syncFiscalDayFromZimra({
  clientId,
  deviceDbId,
  zimraStatus,
  userId,
}: SyncFiscalDayParams) {
  let openFiscalDay: typeof fiscalDays.$inferSelect | null =
    (await db.query.fiscalDays.findFirst({
      where: and(
        eq(fiscalDays.clientId, clientId),
        eq(fiscalDays.deviceId, deviceDbId),
        eq(fiscalDays.status, "OPENED")
      ),
      orderBy: [desc(fiscalDays.fiscalDayNo)],
    })) ?? null;

  if (!zimraStatus) return openFiscalDay;

  if (
    zimraStatus.fiscalDayStatus === "FiscalDayOpened" &&
    zimraStatus.lastFiscalDayNo &&
    !openFiscalDay
  ) {
    const now = new Date();
    const [synced] = await db
      .insert(fiscalDays)
      .values({
        clientId,
        deviceId: deviceDbId,
        fiscalDayNo: zimraStatus.lastFiscalDayNo,
        fiscalDayOpened: now,
        status: "OPENED",
        openOperationId: zimraStatus.operationID || null,
        fdmsStatusResponseJson: JSON.stringify(zimraStatus),
        createdBy: userId || "system",
      })
      .returning();
    openFiscalDay = synced;
  } else if (
    zimraStatus.fiscalDayStatus === "FiscalDayClosed" &&
    openFiscalDay
  ) {
    await db
      .update(fiscalDays)
      .set({
        status: "CLOSED",
        fiscalDayClosed: zimraStatus.fiscalDayClosed
          ? new Date(zimraStatus.fiscalDayClosed)
          : new Date(),
        lastReceiptGlobalNo:
          zimraStatus.lastReceiptGlobalNo ?? openFiscalDay.lastReceiptGlobalNo,
        fdmsStatusResponseJson: JSON.stringify(zimraStatus),
        lastModifiedBy: userId || "system",
      })
      .where(eq(fiscalDays.id, openFiscalDay.id));
    openFiscalDay = null;
  }

  return openFiscalDay;
}
