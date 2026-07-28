import { NextRequest } from "next/server";
import { db } from "@/db";
import { fiscalDays, devices } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/api-response";
import { openDay as fdmsOpenDay, closeDay as fdmsCloseDay, getDeviceStatus, pingDevice } from "@/integration/zimra/device";
import { downloadFileAsText } from "@/services/certificate";

// POST /s2s/fiscal-day - Open/Close day, get status, ping
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, clientId, deviceId, fiscalDayNo, closeRequest } = body;

    if (!action || !clientId || !deviceId) {
      return apiError({
        statusCode: 400,
        message: "action, clientId, and deviceId are required",
      });
    }

    const device = await db.query.devices.findFirst({
      where: and(
        eq(devices.id, deviceId),
        eq(devices.clientId, clientId)
      ),
    });

    if (!device) {
      return apiError({ statusCode: 404, message: "Device not found" });
    }

    if (!device.deviceId || !device.deviceModelName) {
      return apiError({
        statusCode: 400,
        message: "Device not fully configured",
      });
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

    switch (action) {
      case "open-day": {
        const now = new Date();
        const openResult = await fdmsOpenDay(
          device.deviceId,
          device.deviceModelName,
          device.deviceModelVersion || "1.0",
          certificatePem,
          privateKeyPem,
          {
            receiptCounter: fiscalDayNo || 1,
            fiscalDayOpened: now.toISOString().replace(/\.\d{3}Z$/, ""),
            ReconciliationMode: "STANDARD",
          }
        );

        const [fiscalDay] = await db
          .insert(fiscalDays)
          .values({
            clientId,
            deviceId,
            fiscalDayNo: fiscalDayNo || 1,
            fiscalDayOpened: now,
            status: "OPENED",
            openOperationId: openResult.OperationId,
            fdmsOpenResponseJson: JSON.stringify(openResult),
          })
          .returning();

        return apiSuccess({ fiscalDay, fdmsResponse: openResult });
      }

      case "close-day": {
        if (!closeRequest) {
          return apiError({
            statusCode: 400,
            message: "closeRequest is required for close-day action",
          });
        }

        const closeResult = await fdmsCloseDay(
          device.deviceId,
          device.deviceModelName,
          device.deviceModelVersion || "1.0",
          certificatePem,
          privateKeyPem,
          closeRequest
        );

        const [updated] = await db
          .update(fiscalDays)
          .set({
            status: "CLOSED",
            fiscalDayClosed: new Date(),
            closeOperationId: closeResult.OperationId,
            fdmsCloseResponseJson: JSON.stringify(closeResult),
            fiscalDayDeviceSignatureHash: closeResult.CloseFiscalDaySignatureHash,
            fiscalDayDeviceSignature: closeResult.CloseFiscalDaySignature,
          })
          .where(
            and(
              eq(fiscalDays.clientId, clientId),
              eq(fiscalDays.deviceId, deviceId),
              eq(fiscalDays.status, "OPENED")
            )
          )
          .returning();

        return apiSuccess({ fiscalDay: updated, fdmsResponse: closeResult });
      }

      case "status": {
        const statusResult = await getDeviceStatus(
          device.deviceId,
          device.deviceModelName,
          device.deviceModelVersion || "1.0",
          certificatePem,
          privateKeyPem
        );
        return apiSuccess(statusResult);
      }

      case "ping": {
        const pingResult = await pingDevice(
          device.deviceId,
          device.deviceModelName,
          device.deviceModelVersion || "1.0",
          certificatePem,
          privateKeyPem
        );
        return apiSuccess(pingResult);
      }

      default:
        return apiError({ statusCode: 400, message: `Unknown action: ${action}` });
    }
  } catch (error) {
    return apiError(error);
  }
}

// GET /s2s/fiscal-day - Get fiscal day for a device
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const deviceId = searchParams.get("deviceId");
    const fiscalDayNo = searchParams.get("fiscalDayNo");

    if (!clientId || !deviceId) {
      return apiError({
        statusCode: 400,
        message: "clientId and deviceId are required",
      });
    }

    const conditions = [
      eq(fiscalDays.clientId, clientId),
      eq(fiscalDays.deviceId, deviceId),
    ];

    if (fiscalDayNo) {
      conditions.push(eq(fiscalDays.fiscalDayNo, parseInt(fiscalDayNo)));
    }

    const fiscalDay = await db.query.fiscalDays.findFirst({
      where: and(...conditions),
      orderBy: (fiscalDays, { desc }) => [desc(fiscalDays.fiscalDayNo)],
    });

    if (!fiscalDay) {
      return apiError({ statusCode: 404, message: "Fiscal day not found" });
    }

    return apiSuccess(fiscalDay);
  } catch (error) {
    return apiError(error);
  }
}
