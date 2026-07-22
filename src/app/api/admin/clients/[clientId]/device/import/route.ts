import { NextRequest } from "next/server";
import { db } from "@/db";
import { devices } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/tenant";
import { apiSuccess, apiError } from "@/lib/api-response";
import { uploadAllKeyMaterial } from "@/services/certificate";

// POST /api/admin/clients/[clientId]/device/import - Import existing device with certs
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const ctx = await requireAdmin();
    const { clientId } = await params;
    const body = await req.json();

    const {
      deviceId: zimraDeviceId,
      serialNumber,
      deviceModelName,
      deviceModelVersion,
      commonName,
      privateKeyPem,
      publicKeyPem,
      csrPem,
      certificatePem,
      registrationResponseJson,
    } = body;

    if (!zimraDeviceId || !serialNumber || !privateKeyPem || !certificatePem) {
      return apiError({
        statusCode: 400,
        message: "deviceId, serialNumber, privateKeyPem, and certificatePem are required",
      });
    }

    const existing = await db.query.devices.findFirst({
      where: and(
        eq(devices.clientId, clientId),
        eq(devices.deviceId, zimraDeviceId)
      ),
    });

    if (existing) {
      return apiError({
        statusCode: 409,
        message: "Device already exists for this client",
      });
    }

    // Build CSR payload (strip PEM headers/footer, join lines)
    const csrPayload = csrPem
      ? csrPem
          .replace(/-----BEGIN CERTIFICATE REQUEST-----/, "")
          .replace(/-----END CERTIFICATE REQUEST-----/, "")
          .replace(/\n/g, "")
          .trim()
      : "";

    // Upload all key material + certificate to UploadThing
    const urls = await uploadAllKeyMaterial(
      clientId,
      zimraDeviceId,
      {
        commonName: commonName || `ZIMRA-${zimraDeviceId}-${serialNumber}`,
        privateKeyPem,
        publicKeyPem,
        csrPem: csrPem || "",
        csrPayload,
      },
      certificatePem
    );

    // Save device to DB
    const [device] = await db
      .insert(devices)
      .values({
        deviceId: zimraDeviceId,
        serialNumber,
        deviceModelName,
        deviceModelVersion,
        commonName: commonName || `ZIMRA-${zimraDeviceId}-${serialNumber}`,
        csr: csrPem,
        certificate: certificatePem,
        registrationResponseJson: registrationResponseJson || "",
        keyMaterialUrls: JSON.stringify(urls),
        activated: true,
        clientId,
        createdBy: ctx.userId,
      })
      .returning();

    return apiSuccess(device);
  } catch (error: any) {
    return apiError({
      statusCode: error.status || 500,
      message: error.message || "Failed to import device",
    });
  }
}
