import { NextRequest } from "next/server";
import { db } from "@/db";
import { devices, fiscalDays } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireTenant } from "@/lib/tenant";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getDeviceStatus, getDeviceConfig } from "@/integration/zimra/device";
import { downloadFileAsText } from "@/services/certificate";
import { syncFiscalDayFromZimra } from "@/services/fiscal-day-sync";

// GET /tenant/device/[deviceId]/detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const ctx = await requireTenant();
    const clientId = ctx.clientId!;
    const { deviceId: deviceUuid } = await params;

    const device = await db.query.devices.findFirst({
      where: and(eq(devices.id, deviceUuid), eq(devices.clientId, clientId)),
    });
    if (!device) {
      return apiError({ statusCode: 404, message: "Device not found" });
    }

    let zimraStatus: any = null;
    let zimraConfig: any = null;
    let openFiscalDay: typeof fiscalDays.$inferSelect | null =
      (await db.query.fiscalDays.findFirst({
        where: and(
          eq(fiscalDays.clientId, clientId),
          eq(fiscalDays.deviceId, device.id),
          eq(fiscalDays.status, "OPENED")
        ),
        orderBy: [desc(fiscalDays.fiscalDayNo)],
      })) ?? null;

    if (device.certificate && device.keyMaterialUrls && device.deviceId) {
      try {
        const urls = JSON.parse(device.keyMaterialUrls);
        const privateKeyPem = await downloadFileAsText(urls.privateKeyUrl);

        const [status, config] = await Promise.allSettled([
          getDeviceStatus(
            device.deviceId,
            device.deviceModelName || "FiscalEdge",
            device.deviceModelVersion || "1.0.0",
            device.certificate,
            privateKeyPem
          ),
          getDeviceConfig(
            device.deviceId,
            device.deviceModelName || "FiscalEdge",
            device.deviceModelVersion || "1.0.0",
            device.certificate,
            privateKeyPem
          ),
        ]);

        if (status.status === "fulfilled") zimraStatus = status.value;
        if (config.status === "fulfilled") zimraConfig = config.value;

        // Reconcile the locally-tracked open fiscal day with ZIMRA's
        // authoritative status (inserts an open day if ZIMRA has one we are
        // missing, and closes ours when ZIMRA reports the day as closed).
        openFiscalDay = await syncFiscalDayFromZimra({
          clientId,
          deviceDbId: device.id,
          zimraStatus,
          userId: ctx.userId,
        });
      } catch (e) {
        console.warn("Could not fetch ZIMRA status/config:", e);
      }
    }

    return apiSuccess({
      device: {
        id: device.id,
        deviceId: device.deviceId,
        serialNumber: device.serialNumber,
        deviceModelName: device.deviceModelName,
        deviceModelVersion: device.deviceModelVersion,
        activated: device.activated,
        hasCertificate: !!device.certificate,
        hasKeyMaterial: !!device.keyMaterialUrls,
        commonName: device.commonName,
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
      zimraStatus,
      zimraConfig,
    });
  } catch (error: any) {
    return apiError({
      statusCode: error.status || 500,
      message: error.message || "Failed to fetch device detail",
    });
  }
}
