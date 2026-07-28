import { NextRequest } from "next/server";
import { db } from "@/db";
import { devices, fiscalDays } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { requireTenant } from "@/lib/tenant";
import { apiSuccess, apiError } from "@/lib/api-response";
import { closeDay, getDeviceStatus } from "@/integration/zimra/device";
import { downloadFileAsText } from "@/services/certificate";

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

    // Query device status to get fiscal day counters and device signature
    const status = await getDeviceStatus(
      deviceId,
      device.deviceModelName || "FiscalEdge",
      device.deviceModelVersion || "1.0.0",
      device.certificate,
      privateKeyPem
    );

    const deviceSignature = status.fiscalDayDeviceSignature || status.fiscalDayServerSignature;

    const result = await closeDay(
      deviceId,
      device.deviceModelName || "FiscalEdge",
      device.deviceModelVersion || "1.0.0",
      device.certificate,
      privateKeyPem,
      {
        receiptCounter: fiscalDay.receiptCounter ?? 0,
        fiscalDayNo: fiscalDay.fiscalDayNo,
        fiscalDayCounters: status.fiscalDayCounter ?? [],
        fiscalDayDeviceSignature: deviceSignature ?? { hash: "", signature: "" },
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
