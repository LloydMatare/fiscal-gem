import { NextRequest } from "next/server";
import { db } from "@/db";
import { devices, fiscalDays, receipts } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { requireTenant } from "@/lib/tenant";
import { apiSuccess, apiError } from "@/lib/api-response";
import { closeDay } from "@/integration/zimra/device";
import { downloadFileAsText } from "@/services/certificate";
import {
  buildFiscalDayCounters,
  buildFiscalDayDeviceSignature,
  loadFiscalDayReceiptPayloads,
} from "@/services/fiscal-counters";

// POST /tenant/device/close-day
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    const clientId = ctx.clientId!;
    const body = await req.json();

    const { deviceId } = body;
    if (!deviceId) {
      return apiError({ statusCode: 400, message: "deviceId is required" });
    }

    const device = await db.query.devices.findFirst({
      where: and(eq(devices.clientId, clientId), eq(devices.deviceId, deviceId)),
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

    const fiscalDay = await db.query.fiscalDays.findFirst({
      where: and(
        eq(fiscalDays.clientId, clientId),
        eq(fiscalDays.deviceId, device.id),
        inArray(fiscalDays.status, ["OPENED", "CLOSE_INITIATED", "CLOSE_FAILED"])
      ),
      orderBy: [desc(fiscalDays.fiscalDayNo)],
    });

    if (!fiscalDay) {
      return apiError({ statusCode: 400, message: "No open fiscal day to close" });
    }

    const now = new Date();

    // receiptCounter must be the counter of the LAST receipt of the open fiscal
    // day (spec: closeDay "receiptCounter value of last receipt of current
    // fiscal day"). Fall back to the last recorded receipt when the stored
    // counter was never updated.
    let receiptCounter = fiscalDay.receiptCounter ?? 0;
    if (!receiptCounter) {
      const lastReceipt = await db.query.receipts.findFirst({
        where: and(
          eq(receipts.clientId, clientId),
          eq(receipts.deviceId, device.id),
          eq(receipts.fiscalDayNo, fiscalDay.fiscalDayNo)
        ),
        orderBy: [desc(receipts.receiptCounter)],
      });
      receiptCounter = lastReceipt?.receiptCounter ?? 0;
    }

    // Compute the section-6 fiscal day counters locally from the receipts
    // issued during this fiscal day (ZIMRA's GetStatus returns them empty for
    // days closed without counters). Spec requires the device to send them.
    const receiptPayloads = await loadFiscalDayReceiptPayloads({
      clientId,
      deviceUuid: device.id,
      fiscalDayNo: fiscalDay.fiscalDayNo,
    });
    const fiscalDayCounters = buildFiscalDayCounters(receiptPayloads);

    // Spec 13.3.1: the device signs deviceID || fiscalDayNo || fiscalDayDate ||
    // fiscalDayCounters with its private key. GetStatus returns no device
    // signature for an open fiscal day, so build it locally.
    const fiscalDayDeviceSignature = buildFiscalDayDeviceSignature({
      deviceID: deviceId,
      fiscalDayNo: fiscalDay.fiscalDayNo,
      fiscalDayOpened: fiscalDay.fiscalDayOpened,
      fiscalDayCounters,
      privateKeyPem,
    });

    const result = await closeDay(
      deviceId,
      device.deviceModelName || "FiscalEdge",
      device.deviceModelVersion || "1.0.0",
      device.certificate,
      privateKeyPem,
      {
        receiptCounter,
        fiscalDayNo: fiscalDay.fiscalDayNo,
        fiscalDayCounters,
        fiscalDayDeviceSignature,
        fiscalDayClosed: now.toISOString().replace(/\.\d{3}Z$/, ""),
        ReconciliationMode: "STANDARD",
      }
    );

    await db
      .update(fiscalDays)
      .set({
        status: "CLOSED",
        fiscalDayClosed: now,
        closeOperationId: result.OperationId,
        fdmsCloseResponseJson: JSON.stringify(result),
        fiscalDayCountersJson: JSON.stringify(fiscalDayCounters),
        fiscalDayDeviceSignatureHash: result.CloseFiscalDaySignatureHash,
        fiscalDayDeviceSignature: result.CloseFiscalDaySignature,
        lastModifiedBy: ctx.userId,
      })
      .where(eq(fiscalDays.id, fiscalDay.id));

    return apiSuccess({
      operationID: result.OperationId,
      fiscalDayNo: fiscalDay.fiscalDayNo,
    });
  } catch (error: any) {
    return apiError({
      statusCode: error.status || 500,
      message: error.message || "Failed to close fiscal day",
    });
  }
}
