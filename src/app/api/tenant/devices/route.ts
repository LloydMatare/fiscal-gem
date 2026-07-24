import { NextRequest } from "next/server";
import { db } from "@/db";
import { devices } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireTenant } from "@/lib/tenant";
import { apiSuccess, apiError } from "@/lib/api-response";

// GET /tenant/devices
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "100")));

    const data = await db
      .select({
        id: devices.id,
        deviceId: devices.deviceId,
        serialNumber: devices.serialNumber,
        deviceModelName: devices.deviceModelName,
        activated: devices.activated,
      })
      .from(devices)
      .where(eq(devices.clientId, ctx.clientId!))
      .orderBy(desc(devices.createdAt))
      .limit(limit);

    return apiSuccess({ data });
  } catch (error) {
    return apiError(error);
  }
}
