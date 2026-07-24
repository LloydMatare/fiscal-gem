import { NextRequest } from "next/server";
import { db } from "@/db";
import { devices, fiscalDays } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireTenant } from "@/lib/tenant";
import { apiSuccess, apiError } from "@/lib/api-response";

// GET /tenant/device-status - Returns device + fiscal day info for sidebar
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get("deviceId");

    if (!deviceId) {
      return apiError({ statusCode: 400, message: "deviceId is required" });
    }

    const device = await db.query.devices.findFirst({
      where: and(eq(devices.clientId, ctx.clientId!), eq(devices.deviceId, Number(deviceId))),
    });

    if (!device) {
      return apiError({ statusCode: 404, message: "Device not found" });
    }

    const openFiscalDay = await db.query.fiscalDays.findFirst({
      where: and(
        eq(fiscalDays.clientId, ctx.clientId!),
        eq(fiscalDays.deviceId, device.id),
        eq(fiscalDays.status, "OPENED")
      ),
      orderBy: [desc(fiscalDays.fiscalDayNo)],
    });

    return apiSuccess({
      device: {
        id: device.id,
        deviceId: device.deviceId,
        serialNumber: device.serialNumber,
        activated: device.activated,
        hasCertificate: !!device.certificate,
        hasKeyMaterial: !!device.keyMaterialUrls,
      },
      fiscalDay: openFiscalDay
        ? {
            id: openFiscalDay.id,
            fiscalDayNo: openFiscalDay.fiscalDayNo,
            status: openFiscalDay.status,
            openedAt: openFiscalDay.fiscalDayOpened?.toISOString(),
            receiptCounter: openFiscalDay.receiptCounter,
          }
        : null,
    });
  } catch (error) {
    return apiError(error);
  }
}
