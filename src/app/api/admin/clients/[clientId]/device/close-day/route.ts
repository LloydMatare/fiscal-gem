import { NextRequest } from "next/server";
import { db } from "@/db";
import { devices, fiscalDays } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/tenant";
import { apiSuccess, apiError } from "@/lib/api-response";
import { closeDay, getDeviceStatus } from "@/integration/zimra/device";
import { downloadFileAsText } from "@/services/certificate";
import {
  buildFiscalDayCounters,
  buildFiscalDayDeviceSignature,
  loadFiscalDayReceiptPayloads,
} from "@/services/fiscal-counters";

// POST /admin/clients/[clientId]/device/close-day
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    await requireAdmin();
    const { clientId } = await params;
    const body = await req.json();

    const { deviceID, deviceModelName, deviceModelVersion, fiscalDayNo, fiscalDayClosed } = body;

    if (!deviceID) {
      return apiError({ statusCode: 400, message: "deviceID is required" });
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
    const closeDate = fiscalDayClosed ? new Date(fiscalDayClosed) : now;

    // Find the latest open (or close-failed) fiscal day for this device
    const fiscalDay = await db.query.fiscalDays.findFirst({
      where: and(
        eq(fiscalDays.clientId, clientId),
        eq(fiscalDays.deviceId, device.id),
        inArray(fiscalDays.status, ["OPENED", "CLOSE_INITIATED", "CLOSE_FAILED"])
      ),
      orderBy: (fiscalDays, { desc }) => [desc(fiscalDays.fiscalDayNo)],
    });

    // Query device status to get fiscal day counters and device signature
    const status = await getDeviceStatus(
      deviceID,
      deviceModelName || device.deviceModelName || "FiscalEdge",
      deviceModelVersion || device.deviceModelVersion || "1.0.0",
      device.certificate,
      privateKeyPem
    );

    const dayNo = fiscalDayNo || fiscalDay?.fiscalDayNo || status.lastFiscalDayNo || 1;

    // Compute the section-6 fiscal day counters locally from the receipts
    // issued during this fiscal day (ZIMRA's GetStatus returns them empty for
    // days closed without counters). Spec requires the device to send them.
    const receiptPayloads = await loadFiscalDayReceiptPayloads({
      clientId,
      deviceUuid: device.id,
      fiscalDayNo: dayNo,
    });
    const fiscalDayCounters = buildFiscalDayCounters(receiptPayloads);

    // Spec 13.3.1: the device signs deviceID || fiscalDayNo || fiscalDayDate ||
    // fiscalDayCounters with its private key. GetStatus returns no device
    // signature for an open fiscal day, so build it locally.
    const fiscalDayDeviceSignature = buildFiscalDayDeviceSignature({
      deviceID,
      fiscalDayNo: dayNo,
      fiscalDayOpened: fiscalDay?.fiscalDayOpened ?? now,
      fiscalDayCounters,
      privateKeyPem,
    });

    const result = await closeDay(
      deviceID,
      deviceModelName || device.deviceModelName || "FiscalEdge",
      deviceModelVersion || device.deviceModelVersion || "1.0.0",
      device.certificate,
      privateKeyPem,
      {
        receiptCounter: fiscalDay?.receiptCounter ?? 0,
        fiscalDayNo: dayNo,
        fiscalDayCounters,
        fiscalDayDeviceSignature,
        fiscalDayClosed: closeDate.toISOString().replace(/\.\d{3}Z$/, ""),
        ReconciliationMode: "STANDARD",
      }
    );

    // Update the fiscal day record
    if (fiscalDay) {
      await db
        .update(fiscalDays)
        .set({
          status: "CLOSED",
          fiscalDayClosed: closeDate,
          closeOperationId: result.OperationId,
          fdmsCloseResponseJson: JSON.stringify(result),
          fiscalDayCountersJson: JSON.stringify(fiscalDayCounters),
          fiscalDayDeviceSignatureHash: result.CloseFiscalDaySignatureHash,
          fiscalDayDeviceSignature: result.CloseFiscalDaySignature,
        })
        .where(eq(fiscalDays.id, fiscalDay.id));
    }

    return apiSuccess({
      operationID: result.OperationId,
    });
  } catch (error: any) {
    return apiError({
      statusCode: error.status || 500,
      message: error.message || "Failed to close fiscal day",
    });
  }
}
