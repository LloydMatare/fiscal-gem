import { NextRequest } from "next/server";
import { db } from "@/db";
import { devices } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/tenant";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getDeviceStatus } from "@/integration/zimra/device";
import { downloadFileAsText } from "@/services/certificate";

// POST /admin/clients/[clientId]/device/status - Query device status from ZIMRA
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    await requireAdmin();
    const { clientId } = await params;
    const body = await req.json();

    const { deviceID, deviceModelName, deviceModelVersion } = body;

    if (!deviceID) {
      return apiError({
        statusCode: 400,
        message: "deviceID is required",
      });
    }

    // Find the device in DB
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

    const certificatePem = device.certificate;

    let privateKeyPem: string;
    try {
      if (!device.keyMaterialUrls) {
        throw new Error("No key material URLs");
      }
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
      certificatePem,
      privateKeyPem
    );

    return apiSuccess(status);
  } catch (error: any) {
    return apiError({
      statusCode: error.status || 500,
      message: error.message || "Failed to retrieve device status",
    });
  }
}
