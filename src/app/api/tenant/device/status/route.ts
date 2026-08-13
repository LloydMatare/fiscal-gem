import { NextRequest } from "next/server";
import { db } from "@/db";
import { devices } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireTenant } from "@/lib/tenant";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getDeviceStatus } from "@/integration/zimra/device";
import { downloadFileAsText } from "@/services/certificate";
import { syncFiscalDayFromZimra } from "@/services/fiscal-day-sync";

// POST /tenant/device/status - Query device status from ZIMRA
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    const clientId = ctx.clientId!;
    const body = await req.json();

    const { deviceID, deviceModelName, deviceModelVersion } = body;

    if (!deviceID) {
      return apiError({ statusCode: 400, message: "deviceID is required" });
    }

    const device = await db.query.devices.findFirst({
      where: and(
        eq(devices.clientId, clientId),
        eq(devices.deviceId, deviceID)
      ),
    });

    if (!device) {
      return apiError({ statusCode: 404, message: "Device not found" });
    }

    if (!device.certificate) {
      return apiError({
        statusCode: 400,
        message: "Device certificate not found. Register device first.",
      });
    }

    let privateKeyPem: string;
    try {
      if (!device.keyMaterialUrls) throw new Error("No key material URLs");
      const urls = JSON.parse(device.keyMaterialUrls);
      privateKeyPem = await downloadFileAsText(urls.privateKeyUrl);
    } catch {
      return apiError({
        statusCode: 400,
        message: "Device private key not found. Register device first.",
      });
    }

    const status = await getDeviceStatus(
      deviceID,
      deviceModelName || device.deviceModelName || "FiscalEdge",
      deviceModelVersion || device.deviceModelVersion || "1.0.0",
      device.certificate,
      privateKeyPem
    );

    // Reconcile the locally-tracked fiscal day so the tenant UI stays in sync
    // with ZIMRA's authoritative status.
    await syncFiscalDayFromZimra({
      clientId,
      deviceDbId: device.id,
      zimraStatus: status,
      userId: ctx.userId,
    });

    return apiSuccess(status);
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    return apiError({
      statusCode: err.status || 500,
      message: err.message || "Failed to retrieve device status",
    });
  }
}
