import { NextRequest } from "next/server";
import { db } from "@/db";
import { devices, fiscalDays } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireTenant } from "@/lib/tenant";
import { apiSuccess, apiError } from "@/lib/api-response";
import { openDay } from "@/integration/zimra/device";
import { downloadFileAsText } from "@/services/certificate";

// POST /tenant/device/open-day
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    const clientId = ctx.clientId!;
    const body = await req.json();

    const { deviceId } = body;
    if (!deviceId) {
      return apiError({ statusCode: 400, message: "deviceId is required" });
    }

    const device = await db.query.devices.findFirst({
      where: and(eq(devices.clientId, clientId), eq(devices.deviceId, deviceId)),
    });
    if (!device) {
      return apiError({ statusCode: 404, message: "Device not found" });
    }

    if (!device.certificate) {
      return apiError({ statusCode: 400, message: "Device certificate not found" });
    }

    let privateKeyPem: string;
    try {
      if (!device.keyMaterialUrls) throw new Error("No key material URLs");
      const urls = JSON.parse(device.keyMaterialUrls);
      privateKeyPem = await downloadFileAsText(urls.privateKeyUrl);
    } catch {
      return apiError({ statusCode: 400, message: "Device private key not found" });
    }

    // Check for existing open fiscal day
    const existingOpen = await db.query.fiscalDays.findFirst({
      where: and(
        eq(fiscalDays.clientId, clientId),
        eq(fiscalDays.deviceId, device.id),
        eq(fiscalDays.status, "OPENED")
      ),
      orderBy: [desc(fiscalDays.fiscalDayNo)],
    });

    if (existingOpen) {
      return apiError({ statusCode: 400, message: `Fiscal day #${existingOpen.fiscalDayNo} is already open. Close it first.` });
    }

    // Determine next fiscal day number
    const lastDay = await db.query.fiscalDays.findFirst({
      where: and(eq(fiscalDays.clientId, clientId), eq(fiscalDays.deviceId, device.id)),
      orderBy: [desc(fiscalDays.fiscalDayNo)],
    });
    const fiscalDayNo = (lastDay?.fiscalDayNo || 0) + 1;

    const now = new Date();

    const result = await openDay(
      deviceId,
      device.deviceModelName || "FiscalEdge",
      device.deviceModelVersion || "1.0.0",
      device.certificate,
      privateKeyPem,
      {
        ReceiptNo: fiscalDayNo,
        OpenDate: now.toISOString().split("T")[0],
        OpenTime: now.toTimeString().split(" ")[0],
        ReconciliationMode: "STANDARD",
      }
    );

    await db.insert(fiscalDays).values({
      clientId,
      deviceId: device.id,
      fiscalDayNo,
      fiscalDayOpened: now,
      status: "OPENED",
      openOperationId: result.OperationId,
      fdmsOpenResponseJson: JSON.stringify(result),
      createdBy: ctx.userId,
    });

    return apiSuccess({
      operationID: result.OperationId,
      fiscalDayNo: result.ReceiptNo || fiscalDayNo,
    });
  } catch (error: any) {
    return apiError({
      statusCode: error.status || 500,
      message: error.message || "Failed to open fiscal day",
    });
  }
}
