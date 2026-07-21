import { NextRequest } from "next/server";
import { db } from "@/db";
import { devices } from "@/db/schema";
import { eq, desc, count, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/tenant";
import { apiSuccess, apiCreated, apiError, getSearchParams } from "@/lib/api-response";
import { generateCsr, saveKeyMaterial } from "@/services/certificate";

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

// POST /admin/clients/[clientId]/device - Register a new device
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
      commonName: providedCn,
    } = body;

    if (!zimraDeviceId || !serialNumber) {
      return apiError({
        statusCode: 400,
        message: "deviceId and serialNumber are required",
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

    const csrResult = await generateCsr(zimraDeviceId, serialNumber);
    await saveKeyMaterial(clientId, zimraDeviceId, csrResult);

    const [device] = await db
      .insert(devices)
      .values({
        deviceId: zimraDeviceId,
        serialNumber,
        deviceModelName,
        deviceModelVersion,
        commonName: providedCn || csrResult.commonName,
        csr: csrResult.csrPem,
        clientId,
        activated: false,
        createdBy: ctx.userId,
      })
      .returning();

    return apiCreated(device);
  } catch (error) {
    return apiError(error);
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
