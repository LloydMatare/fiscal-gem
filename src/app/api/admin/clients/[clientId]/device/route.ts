import { NextRequest } from "next/server";
import { db } from "@/db";
import { devices } from "@/db/schema";
import { eq, desc, count, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/tenant";
import { apiSuccess, apiCreated, apiError, getSearchParams } from "@/lib/api-response";
import { generateCsr, uploadAllKeyMaterial } from "@/services/certificate";
import { registerDevice } from "@/integration/zimra/device";

// GET /admin/clients/[clientId]/device
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    await requireAdmin();
    const { clientId } = await params;
    const { page, limit, offset } = getSearchParams(req);

    const [{ total }] = await db
      .select({ total: count() })
      .from(devices)
      .where(eq(devices.clientId, clientId));

    const data = await db
      .select()
      .from(devices)
      .where(eq(devices.clientId, clientId))
      .orderBy(desc(devices.createdAt))
      .limit(limit)
      .offset(offset);

    return apiSuccess({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return apiError(error);
  }
}

// POST /admin/clients/[clientId]/device - Register a new device with ZIMRA
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
      activationKey,
    } = body;

    if (!zimraDeviceId || !serialNumber || !activationKey) {
      return apiError({
        statusCode: 400,
        message: "deviceId, serialNumber, and activationKey are required",
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
        message: "Device already registered for this client",
      });
    }

    // 1. Generate EC key pair + CSR
    const csrResult = await generateCsr(zimraDeviceId, serialNumber);

    // 2. Call ZIMRA RegisterDevice
    const zimraResponse = await registerDevice(
      zimraDeviceId,
      deviceModelName || "FiscalEdge",
      deviceModelVersion || "1.0.0",
      {
        ActivationKey: activationKey,
        CertificateRequest: csrResult.csrPem,
      }
    );

    // 3. Upload all key material + certificate to UploadThing
    const urls = await uploadAllKeyMaterial(
      clientId,
      zimraDeviceId,
      csrResult,
      zimraResponse.certificate
    );

    // 4. Save device to DB
    const [device] = await db
      .insert(devices)
      .values({
        deviceId: zimraDeviceId,
        serialNumber,
        deviceModelName,
        deviceModelVersion,
        activationKey,
        commonName: csrResult.commonName,
        csr: csrResult.csrPem,
        certificate: zimraResponse.certificate,
        registrationResponseJson: JSON.stringify(zimraResponse),
        keyMaterialUrls: JSON.stringify(urls),
        activated: true,
        clientId,
        createdBy: ctx.userId,
      })
      .returning();

    return apiCreated(device);
  } catch (error: any) {
    return apiError({
      statusCode: error.status || 500,
      message: error.message || "Failed to register device",
    });
  }
}

// PUT /admin/clients/[clientId]/device - Update device details
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const ctx = await requireAdmin();
    const { clientId } = await params;
    const body = await req.json();

    const { deviceId: deviceRecordId, serialNumber, deviceModelName, deviceModelVersion, commonName } = body;

    if (!deviceRecordId) {
      return apiError({ statusCode: 400, message: "deviceId (record id) is required" });
    }

    const [updated] = await db
      .update(devices)
      .set({
        serialNumber,
        deviceModelName,
        deviceModelVersion,
        commonName,
        lastModifiedBy: ctx.userId,
      })
      .where(and(eq(devices.id, deviceRecordId), eq(devices.clientId, clientId)))
      .returning();

    if (!updated) {
      return apiError({ statusCode: 404, message: "Device not found" });
    }

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}

// DELETE /admin/clients/[clientId]/device?deviceId=xxx
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    await requireAdmin();
    const { clientId } = await params;
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get("deviceId");

    if (!deviceId) {
      return apiError({ statusCode: 400, message: "deviceId query param is required" });
    }

    const [deleted] = await db
      .delete(devices)
      .where(and(eq(devices.id, deviceId), eq(devices.clientId, clientId)))
      .returning();

    if (!deleted) {
      return apiError({ statusCode: 404, message: "Device not found" });
    }

    return apiSuccess({ message: "Device deleted" });
  } catch (error) {
    return apiError(error);
  }
}
