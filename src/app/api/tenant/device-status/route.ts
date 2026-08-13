import { NextRequest } from "next/server";
import { db } from "@/db";
import { devices, fiscalDays } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireTenant } from "@/lib/tenant";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getDeviceStatus } from "@/integration/zimra/device";
import { downloadFileAsText } from "@/services/certificate";
import { syncFiscalDayFromZimra } from "@/services/fiscal-day-sync";

// GET /tenant/device-status - Returns device + fiscal day info for sidebar
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    const clientId = ctx.clientId!;
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get("deviceId");

    if (!deviceId) {
      return apiError({ statusCode: 400, message: "deviceId is required" });
    }

    const device = await db.query.devices.findFirst({
      where: and(eq(devices.clientId, clientId), eq(devices.deviceId, Number(deviceId))),
    });

    if (!device) {
      return apiError({ statusCode: 404, message: "Device not found" });
    }

    let openFiscalDay: typeof fiscalDays.$inferSelect | null =
      (await db.query.fiscalDays.findFirst({
        where: and(
          eq(fiscalDays.clientId, clientId),
          eq(fiscalDays.deviceId, device.id),
          eq(fiscalDays.status, "OPENED")
        ),
        orderBy: [desc(fiscalDays.fiscalDayNo)],
      })) ?? null;

    // Only reach out to ZIMRA when we think a day is open, so a day that was
    // closed on ZIMRA's side is reflected here too (avoids polling ZIMRA on
    // every refresh while the device has no open day).
    if (
      openFiscalDay &&
      device.certificate &&
      device.keyMaterialUrls &&
      device.deviceId
    ) {
      try {
        const urls = JSON.parse(device.keyMaterialUrls);
        const privateKeyPem = await downloadFileAsText(urls.privateKeyUrl);
        const zimraStatus = await getDeviceStatus(
          device.deviceId,
          device.deviceModelName || "FiscalEdge",
          device.deviceModelVersion || "1.0.0",
          device.certificate,
          privateKeyPem
        );

        openFiscalDay = await syncFiscalDayFromZimra({
          clientId,
          deviceDbId: device.id,
          zimraStatus,
          userId: ctx.userId,
        });
      } catch (e) {
        console.warn("Could not fetch ZIMRA status:", e);
      }
    }

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
