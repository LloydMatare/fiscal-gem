import { NextRequest } from "next/server";
import { db } from "@/db";
import { devices, fiscalDays } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/tenant";
import { apiSuccess, apiError } from "@/lib/api-response";
import { closeDay } from "@/integration/zimra/device";
import { downloadFileAsText } from "@/services/certificate";

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

    // Find the latest open fiscal day for this device
    const openDay = await db.query.fiscalDays.findFirst({
      where: and(
        eq(fiscalDays.clientId, clientId),
        eq(fiscalDays.deviceId, device.id),
        eq(fiscalDays.status, "OPENED")
      ),
      orderBy: (fiscalDays, { desc }) => [desc(fiscalDays.fiscalDayNo)],
    });

    const dayNo = fiscalDayNo || openDay?.fiscalDayNo || 1;

    const result = await closeDay(
      deviceID,
      deviceModelName || device.deviceModelName || "FiscalEdge",
      deviceModelVersion || device.deviceModelVersion || "1.0.0",
      device.certificate,
      privateKeyPem,
      {
        ReceiptNo: dayNo,
        CloseDate: closeDate.toISOString().split("T")[0],
        CloseTime: closeDate.toTimeString().split(" ")[0],
        ReconciliationMode: "STANDARD",
      }
    );

    // Update the fiscal day record
    if (openDay) {
      await db
        .update(fiscalDays)
        .set({
          status: "CLOSED",
          fiscalDayClosed: closeDate,
          closeOperationId: result.OperationId,
          fdmsCloseResponseJson: JSON.stringify(result),
          fiscalDayDeviceSignatureHash: result.CloseFiscalDaySignatureHash,
          fiscalDayDeviceSignature: result.CloseFiscalDaySignature,
        })
        .where(eq(fiscalDays.id, openDay.id));
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
