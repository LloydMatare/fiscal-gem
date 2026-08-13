import { NextRequest } from "next/server";
import { db } from "@/db";
import { devices } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireTenant } from "@/lib/tenant";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getDeviceConfig } from "@/integration/zimra/device";
import { downloadFileAsText } from "@/services/certificate";

// POST /tenant/device/config - Query device configuration from ZIMRA
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

    const config = await getDeviceConfig(
      deviceID,
      deviceModelName || device.deviceModelName || "FiscalEdge",
      deviceModelVersion || device.deviceModelVersion || "1.0.0",
      device.certificate,
      privateKeyPem
    );

    return apiSuccess(config);
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    return apiError({
      statusCode: err.status || 500,
      message: err.message || "Failed to retrieve device configuration",
    });
  }
}
