import { db } from "@/db";
import { devices, fiscalDays, receipts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export async function validateReceiptSubmit(
  clientId: string,
  body: Record<string, unknown>
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];

  const deviceId = body.deviceId as number | undefined;
  const fiscalPayload = body.fiscalPayload as Record<string, unknown> | undefined;

  if (!deviceId) {
    errors.push({ field: "deviceId", message: "deviceId is required" });
  }

  if (!fiscalPayload?.receipt) {
    errors.push({ field: "fiscalPayload.receipt", message: "fiscalPayload.receipt is required" });
    return { valid: false, errors };
  }

  const receipt = fiscalPayload.receipt as Record<string, unknown>;

  if (!receipt.invoiceNo) {
    errors.push({ field: "fiscalPayload.receipt.invoiceNo", message: "invoiceNo is required" });
  }

  const lines = receipt.receiptLines as Array<Record<string, unknown>> | undefined;
  if (!lines || lines.length === 0) {
    errors.push({ field: "fiscalPayload.receipt.receiptLines", message: "At least one receipt line is required" });
  } else {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.receiptLineName) {
        errors.push({ field: `receiptLines[${i}].receiptLineName`, message: "Line name is required" });
      }
      if (typeof line.receiptLineQuantity !== "number" || line.receiptLineQuantity <= 0) {
        errors.push({ field: `receiptLines[${i}].receiptLineQuantity`, message: "Quantity must be > 0" });
      }
      if (typeof line.receiptLinePrice !== "number" || line.receiptLinePrice < 0) {
        errors.push({ field: `receiptLines[${i}].receiptLinePrice`, message: "Price must be >= 0" });
      }
    }
  }

  const payments = receipt.receiptPayments as Array<Record<string, unknown>> | undefined;
  if (!payments || payments.length === 0) {
    errors.push({ field: "fiscalPayload.receipt.receiptPayments", message: "At least one payment is required" });
  } else {
    const totalPayments = payments.reduce(
      (sum, p) => sum + ((p.paymentAmount as number) || 0),
      0
    );
    const receiptTotal = (receipt.receiptTotal as number) || 0;
    if (Math.abs(totalPayments - receiptTotal) > 0.01) {
      errors.push({
        field: "fiscalPayload.receipt.receiptPayments",
        message: `Payment total (${totalPayments}) does not match receipt total (${receiptTotal})`,
      });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // DB-level validations
  if (deviceId) {
    const device = await db.query.devices.findFirst({
      where: and(eq(devices.clientId, clientId), eq(devices.deviceId, deviceId)),
    });

    if (!device) {
      errors.push({ field: "deviceId", message: "Device not found for this client" });
      return { valid: false, errors };
    }

    if (!device.activated) {
      errors.push({ field: "deviceId", message: "Device is not activated" });
    }

    if (!device.certificate) {
      errors.push({ field: "deviceId", message: "Device has no certificate" });
    }

    if (!device.keyMaterialUrls) {
      errors.push({ field: "deviceId", message: "Device has no private key material" });
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // Check fiscal day is open
    const openFiscalDay = await db.query.fiscalDays.findFirst({
      where: and(
        eq(fiscalDays.clientId, clientId),
        eq(fiscalDays.deviceId, device.id),
        eq(fiscalDays.status, "OPENED")
      ),
      orderBy: [desc(fiscalDays.fiscalDayNo)],
    });

    if (!openFiscalDay) {
      errors.push({ field: "fiscalDay", message: "No open fiscal day for this device. Open a fiscal day first." });
      return { valid: false, errors };
    }

    // Check duplicate external reference
    const externalRef = body.externalReference as string | undefined;
    if (externalRef) {
      const existing = await db.query.receipts.findFirst({
        where: and(
          eq(receipts.clientId, clientId),
          eq(receipts.externalReference, externalRef)
        ),
      });
      if (existing) {
        errors.push({ field: "externalReference", message: "A receipt with this external reference already exists" });
      }
    }

    // Check receipt global no conflict
    const lastReceipt = await db.query.receipts.findFirst({
      where: and(eq(receipts.clientId, clientId), eq(receipts.deviceId, device.id)),
      orderBy: [desc(receipts.receiptGlobalNo)],
    });
    const nextGlobalNo = (lastReceipt?.receiptGlobalNo || 0) + 1;
    const requestedGlobalNo = receipt.receiptGlobalNo as number | undefined;
    if (requestedGlobalNo && requestedGlobalNo !== nextGlobalNo) {
      errors.push({
        field: "fiscalPayload.receipt.receiptGlobalNo",
        message: `Expected receiptGlobalNo ${nextGlobalNo}, got ${requestedGlobalNo}`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}
