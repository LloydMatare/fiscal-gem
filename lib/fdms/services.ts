import { db } from "@/lib/db";
import { devices, fiscalDays, receipts } from "@/lib/db/schema";
import { createFdmsClient } from "./client";
import { generateReceiptSignature, sha256Hash, normalizeReceiptData, signData, generateKeyPair, generateCsr, encrypt, decrypt } from "./crypto";
import { eq, desc } from "drizzle-orm";
import type { OpenDayResponse, CloseDayResponse, SubmitReceiptResponse, SubmitFileResponse, GetConfigResponse, RegisterDeviceRequest, RegisterDeviceResponse, IssueCertificateResponse } from "./types";

// Register device
export async function registerDevice(organizationId: string, deviceData: {
  deviceId: number;
  serialNumber: string;
  activationKey: string;
  branchName?: string;
  branchAddress?: any;
  branchContacts?: any;
}) {
  // Generate key pair
  const { publicKey, privateKey } = await generateKeyPair();

  // Create CSR
  const commonName = `ZIMRA-${deviceData.serialNumber}-${deviceData.deviceId}`;
  const csr = generateCsr(commonName, privateKey);

  // Call registerDevice
  const client = createFdmsClient("", ""); // No mTLS for registration
  const registerResponse: RegisterDeviceResponse = await client.registerDevice({
    deviceID: deviceData.deviceId,
    activationKey: deviceData.activationKey,
    certificateRequest: csr,
  });

  // Issue certificate if needed? Wait, registerDevice returns certificate directly?

  // Wait, according to types, RegisterDeviceResponse has certificate.

  // Store device with encrypted private key
  const encryptedPrivateKey = encrypt(privateKey);

  const [device] = await (db as any)
    .insert(devices)
    .values({
      organizationId,
      deviceId: deviceData.deviceId,
      serialNumber: deviceData.serialNumber,
      activationKey: deviceData.activationKey,
      privateKey: encryptedPrivateKey,
      certificatePem: registerResponse.certificate,
      status: "registered",
      branchName: deviceData.branchName,
      branchAddress: deviceData.branchAddress,
      branchContacts: deviceData.branchContacts,
    })
    .returning();

  return device;
}

// Get config and store tax rates and payer details
export async function getDeviceConfig(deviceId: string) {
  const device = (await (db as any).select().from(devices).where(eq(devices.id, deviceId))).at(0);

  if (!device || !device.certificatePem || !device.privateKey) {
    throw new Error("Device not registered");
  }

  const privateKey = decrypt(device.privateKey);
  const client = createFdmsClient(device.certificatePem, privateKey);

  const config: GetConfigResponse = await client.getConfig({ deviceID: device.deviceId! });

  // Store in device
  await (db as any)
    .update(devices)
    .set({
      taxRates: config.taxRates,
      taxPayerDetails: config.taxPayerDetails,
    })
    .where(eq(devices.id, deviceId));

  return config;
}

// Open fiscal day
export async function openFiscalDay(deviceId: string) {
  const device = (await (db as any).select().from(devices).where(eq(devices.id, deviceId))).at(0);

  if (!device || !device.certificatePem || !device.privateKey) {
    throw new Error("Device not registered");
  }

  const privateKey = decrypt(device.privateKey);
  const client = createFdmsClient(device.certificatePem, privateKey);

  const response: OpenDayResponse = await client.openDay({
    deviceID: device.deviceId!,
  });

  // Create fiscal day record
  const [fiscalDay] = await (db as any)
    .insert(fiscalDays)
    .values({
      deviceId,
      fdmsDayNo: response.fdmsDayNo,
      openedAt: new Date(),
    })
    .returning();

  return fiscalDay;
}

// Submit receipt
export async function submitReceipt(deviceId: string, receiptData: {
  type: string;
  currency: string;
  globalNo: string;
  date: string;
  total: number;
  taxes: string;
  items: any[];
}) {
  const device = (await (db as any).select().from(devices).where(eq(devices.id, deviceId))).at(0);

  if (!device || !device.certificatePem || !device.privateKey) {
    throw new Error("Device not registered");
  }

  const privateKey = decrypt(device.privateKey);
  const prevHash = device.lastReceiptHash || "";

  const normalized = normalizeReceiptData({
    deviceID: device.deviceId!,
    ...receiptData,
    prevHash,
  });
  const hash = sha256Hash(normalized);
  const signature = signData(hash, privateKey);

  const payload = {
    ...receiptData,
    deviceID: device.deviceId!,
    receiptSignature: signature,
    previousReceiptHash: prevHash,
  };

  const client = createFdmsClient(device.certificatePem, privateKey);

  let response: SubmitReceiptResponse | SubmitFileResponse;
  let status: "submitted" | "pending" = "submitted";
  let fdmsOperationId: string | undefined;
  let fdmsReceiptUrl: string | undefined;

  try {
    if (device.mode === "offline") {
      // Use submitFile for offline mode
      const fileContent = Buffer.from(JSON.stringify([payload])).toString('base64');
      response = await client.submitFile({
        deviceID: device.deviceId!,
        fileType: "RECEIPTS",
        fileContent,
      });
      fdmsOperationId = (response as SubmitFileResponse).operationID;
    } else {
      // Online mode
      response = await client.submitReceipt(payload);
      fdmsOperationId = (response as SubmitReceiptResponse).operationID;
      fdmsReceiptUrl = (response as SubmitReceiptResponse).receiptQrCodeUrl;
    }
  } catch (error) {
    // If submission fails, mark as pending for retry
    status = "pending";
  }

  // Get current fiscal day
  const fiscalDay = (await (db as any).select().from(fiscalDays).where(eq(fiscalDays.deviceId, deviceId)).orderBy(desc(fiscalDays.createdAt))).at(0);

  if (!fiscalDay) {
    throw new Error("No open fiscal day");
  }

  // Insert receipt
  const [receipt] = await (db as any)
    .insert(receipts)
    .values({
      deviceId,
      fiscalDayId: fiscalDay.id,
      receiptNo: receiptData.globalNo,
      currency: receiptData.currency,
      total: receiptData.total,
      payload,
      previousReceiptHash: prevHash,
      fdmsOperationId,
      fdmsReceiptUrl,
      status,
      submittedAt: status === "submitted" ? new Date() : undefined,
    })
    .returning();

  // Update device's lastReceiptHash only if submitted
  if (status === "submitted") {
    await (db as any)
      .update(devices)
      .set({
        lastReceiptHash: hash,
      })
      .where(eq(devices.id, deviceId));
  }

  return receipt;
}

// Close fiscal day
export async function closeFiscalDay(deviceId: string) {
  const device = (await (db as any).select().from(devices).where(eq(devices.id, deviceId))).at(0);

  if (!device || !device.certificatePem || !device.privateKey) {
    throw new Error("Device not registered");
  }

  const privateKey = decrypt(device.privateKey);

  // Get current fiscal day
  const fiscalDay = (await (db as any).select().from(fiscalDays).where(eq(fiscalDays.deviceId, deviceId)).orderBy(desc(fiscalDays.createdAt))).at(0);

  if (!fiscalDay) {
    throw new Error("No open fiscal day");
  }

  // Aggregate sales/taxes
  const receiptsData = await (db as any).select().from(receipts).where(eq(receipts.fiscalDayId, fiscalDay.id));

  // Calculate totals
  const totalSales = receiptsData.reduce((sum: number, r: any) => sum + (r.total || 0), 0);
  // Assume taxes calculation, for now simple
  const totalTaxes = 0; // TODO: calculate from receipts

  // Generate signature for close day
  const closeData = {
    deviceID: device.deviceId!,
    fdmsDayNo: fiscalDay.fdmsDayNo!,
    totalSales,
    totalTaxes,
    date: new Date().toISOString().split('T')[0],
  };

  // Normalize and sign, similar to receipt but for close
  // Assuming similar normalization
  const normalized = normalizeReceiptData({
    deviceID: closeData.deviceID,
    type: "CLOSE",
    currency: "ZWL",
    globalNo: closeData.fdmsDayNo.toString(),
    date: closeData.date,
    total: totalSales,
    taxes: totalTaxes.toString(),
    prevHash: device.lastReceiptHash || "",
  });
  const hash = sha256Hash(normalized);
  const signature = signData(hash, privateKey);

  const payload = {
    ...closeData,
    signature,
  };

  const client = createFdmsClient(device.certificatePem, privateKey);

  const response: CloseDayResponse = await client.closeDay(payload);

  // Update fiscal day
  await (db as any)
    .update(fiscalDays)
    .set({
      status: "closed",
      closedAt: new Date(),
      summary: {
        totalSales,
        totalTaxes,
        receiptCount: receiptsData.length,
      },
      fdmsOperationId: response.operationID,
    })
    .where(eq(fiscalDays.id, fiscalDay.id));

  return fiscalDay;
}

// Process pending receipts (for background job or cron)
export async function processPendingReceipts() {
  const pendingReceipts = await (db as any).select().from(receipts).where(eq(receipts.status, "pending"));

  for (const receipt of pendingReceipts) {
    try {
      const device = (await (db as any).select().from(devices).where(eq(devices.id, receipt.deviceId))).at(0);

      if (!device || !device.certificatePem || !device.privateKey) {
        continue;
      }

      const privateKey = decrypt(device.privateKey);
      const client = createFdmsClient(device.certificatePem, privateKey);

      let response: SubmitReceiptResponse | SubmitFileResponse;
      let fdmsOperationId: string | undefined;
      let fdmsReceiptUrl: string | undefined;

      if (device.mode === "offline") {
        // Batch pending receipts for this device
        const devicePending = pendingReceipts.filter(r => r.deviceId === device.id);
        const payloads = devicePending.map(r => r.payload);
        const fileContent = Buffer.from(JSON.stringify(payloads)).toString('base64');
        response = await client.submitFile({
          deviceID: device.deviceId!,
          fileType: "RECEIPTS",
          fileContent,
        });
        fdmsOperationId = (response as SubmitFileResponse).operationID;
        // Update all device pending receipts
        await (db as any)
          .update(receipts)
          .set({
            status: "submitted",
            submittedAt: new Date(),
            fdmsOperationId,
          })
          .where(eq(receipts.deviceId, device.id))
          .where(eq(receipts.status, "pending"));
        // Update lastReceiptHash to the last one
        const lastReceipt = devicePending[devicePending.length - 1];
        await (db as any)
          .update(devices)
          .set({
            lastReceiptHash: sha256Hash(normalizeReceiptData(lastReceipt.payload)),
          })
          .where(eq(devices.id, device.id));
      } else {
        // Retry submitReceipt for each
        response = await client.submitReceipt(receipt.payload);
        fdmsOperationId = (response as SubmitReceiptResponse).operationID;
        fdmsReceiptUrl = (response as SubmitReceiptResponse).receiptQrCodeUrl;
        // Update this receipt
        await (db as any)
          .update(receipts)
          .set({
            status: "submitted",
            submittedAt: new Date(),
            fdmsOperationId,
            fdmsReceiptUrl,
          })
          .where(eq(receipts.id, receipt.id));
        // Update lastReceiptHash
        await (db as any)
          .update(devices)
          .set({
            lastReceiptHash: sha256Hash(normalizeReceiptData(receipt.payload)),
          })
          .where(eq(devices.id, device.id));
      }
    } catch (error) {
      // If still fails, keep pending
      console.error(`Failed to submit receipt ${receipt.id}:`, error);
    }
  }
}