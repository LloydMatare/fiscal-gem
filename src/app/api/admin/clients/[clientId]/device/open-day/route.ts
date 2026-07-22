import { NextRequest } from "next/server";
import { db } from "@/db";
import { devices, fiscalDays } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/tenant";
import { apiSuccess, apiError } from "@/lib/api-response";
import { openDay } from "@/integration/zimra/device";
import { downloadFileAsText } from "@/services/certificate";

// POST /admin/clients/[clientId]/device/open-day
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    await requireAdmin();
    const { clientId } = await params;
    const body = await req.json();

    const { deviceID, deviceModelName, deviceModelVersion, request: dayRequest } = body;

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

    const fiscalDayNo = dayRequest?.fiscalDayNo || 1;
    const now = new Date();

    const result = await openDay(
      deviceID,
      deviceModelName || device.deviceModelName || "FiscalEdge",
      deviceModelVersion || device.deviceModelVersion || "1.0.0",
      device.certificate,
      privateKeyPem,
      {
        ReceiptNo: fiscalDayNo,
        OpenDate: (dayRequest?.fiscalDayOpened ? new Date(dayRequest.fiscalDayOpened) : now)
          .toISOString()
          .split("T")[0],
        OpenTime: (dayRequest?.fiscalDayOpened ? new Date(dayRequest.fiscalDayOpened) : now)
          .toTimeString()
          .split(" ")[0],
        ReconciliationMode: "STANDARD",
      }
    );

    // Save fiscal day record
    await db.insert(fiscalDays).values({
      clientId,
      deviceId: device.id,
      fiscalDayNo,
      fiscalDayOpened: now,
      status: "OPENED",
      openOperationId: result.OperationId,
      fdmsOpenResponseJson: JSON.stringify(result),
    });

    return apiSuccess({
      operationID: result.OperationId,
      fiscalDayNo: result.ReceiptNo || fiscalDayNo,
    });
  } catch (error: any) {
    return apiError({
      statusCode: error.status || 500,
      message: error.message || "Failed to open fiscal day",
    });
  }
}
