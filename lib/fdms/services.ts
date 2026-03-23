//@ts-nocheck
import { db } from "@/lib/db";
import { devices, fiscalDays, receipts } from "@/lib/db/schema";
import { createFdmsClient } from "./client";
import {
  generateReceiptSignature,
  normalizeReceiptData,
  generateKeyPair,
  generateCsr,
  encrypt,
  decrypt,
  signData,
  formatTaxPercent
} from "./crypto";
import { eq, desc, and, asc } from "drizzle-orm";
import type {
  OpenDayResponse,
  CloseDayResponse,
  SubmitReceiptResponse,
  SubmitFileResponse,
  GetConfigResponse,
  RegisterDeviceResponse
} from "./types";

/**
 * Registers a new fiscal device with ZIMRA and stores credentials.
 */
export async function registerDevice(organizationId: string, deviceData: {
  deviceId: number;
  serialNumber: string;
  activationKey: string;
  branchName?: string;
  branchAddress?: any;
  branchContacts?: any;
}) {
  const { privateKey } = await generateKeyPair();
  const csr = generateCsr(deviceData.deviceId.toString(), deviceData.serialNumber, privateKey);
  const client = createFdmsClient("", "", deviceData.deviceId.toString());
  const registerResponse: RegisterDeviceResponse = await client.registerDevice({
    certificateRequest: csr,
    activationKey: deviceData.activationKey,
  });

  const encryptedPrivateKey = encrypt(privateKey);
  const [device] = await db.insert(devices).values({
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
  }).returning();

  return device;
}

/**
 * Retrieves and persists the device configuration from ZIMRA.
 */
export async function getDeviceConfig(id: string) {
  const device = (await db.select().from(devices).where(eq(devices.id, id))).at(0);
  if (!device || !device.certificatePem || !device.privateKey || !device.deviceId) {
    throw new Error("Device not properly registered");
  }

  const privateKey = decrypt(device.privateKey);
  const client = createFdmsClient(device.certificatePem, privateKey, device.deviceId.toString());
  const config: GetConfigResponse = await client.getConfig({});

  await db.update(devices).set({
    taxRates: config.taxRates,
    taxPayerDetails: config.taxPayerDetails,
    mode: (config.operationMode ?? "online").toLowerCase() as "online" | "offline",
    status: "active",
  }).where(eq(devices.id, id));

  return config;
}

/**
 * Opens a new fiscal day.
 */
export async function openFiscalDay(id: string) {
  const device = (await db.select().from(devices).where(eq(devices.id, id))).at(0);
  if (!device || !device.certificatePem || !device.privateKey || !device.deviceId) {
    throw new Error("Device not active");
  }

  const privateKey = decrypt(device.privateKey);
  const client = createFdmsClient(device.certificatePem, privateKey, device.deviceId.toString());
  const response: OpenDayResponse = await client.openDay({});

  const [fiscalDay] = await db.insert(fiscalDays).values({
    deviceId: id,
    fdmsDayNo: response.fdmsDayNo,
    status: "open",
    openedAt: new Date(),
  }).returning();

  return fiscalDay;
}

/**
 * Normalizes fiscal day data for signing.
 */
type FiscalCounter = {
  type: string;
  currency: string;
  taxPercent?: number;
  moneyType?: string;
  value: number;
};

function normalizeFiscalDayData(data: {
  deviceID: number;
  fiscalDayNo: number;
  fiscalDayDate: string; // YYYY-MM-DD
  counters: FiscalCounter[];
}): string {
  // Sort counters by type, then currency, then tax/money
  const sortedCounters = [...data.counters]
    .filter(c => c.value !== 0)
    .sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      if (a.currency !== b.currency) return a.currency.localeCompare(b.currency);
      const valA = a.taxPercent !== undefined ? a.taxPercent.toString() : (a.moneyType || "");
      const valB = b.taxPercent !== undefined ? b.taxPercent.toString() : (b.moneyType || "");
      return valA.localeCompare(valB);
    });

  const counterString = sortedCounters.map(c => {
    const taxOrMoney = c.taxPercent !== undefined ? formatTaxPercent(c.taxPercent) : (c.moneyType || "");
    return `${c.type}${c.currency}${taxOrMoney}${c.value}`;
  }).join('');

  return `${data.deviceID}${data.fiscalDayNo}${data.fiscalDayDate}${counterString}`;
}

/**
 * Closes an open fiscal day.
 */
export async function closeFiscalDay(id: string) {
  const device = (await db.select().from(devices).where(eq(devices.id, id))).at(0);
  if (!device || !device.certificatePem || !device.privateKey || !device.deviceId) {
    throw new Error("Device not active");
  }

  const fiscalDay = (await db.select().from(fiscalDays)
    .where(and(eq(fiscalDays.deviceId, id), eq(fiscalDays.status, "open")))
    .orderBy(desc(fiscalDays.openedAt))).at(0);

  if (!fiscalDay) throw new Error("No open fiscal day found");

  // In a real app, you'd aggregate real counters from the DB.
  // For now, we'll use a placeholder or pull from the receipts table.
  const dayReceipts = await db.select().from(receipts).where(eq(receipts.fiscalDayId, fiscalDay.id));

  // Example counter: SALE BY TAX for ZWL
  const totalSales = dayReceipts.reduce((sum, r) => sum + (r.total || 0), 0);

  const counters: FiscalCounter[] = [
    { type: "SALEBYTAX", currency: "ZWL", taxPercent: 15.0, value: totalSales }
  ];

  const dateStr = fiscalDay.openedAt ? new Date(fiscalDay.openedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  const normalized = normalizeFiscalDayData({
    deviceID: device.deviceId,
    fiscalDayNo: fiscalDay.fdmsDayNo!,
    fiscalDayDate: dateStr,
    counters
  });

  const privateKey = decrypt(device.privateKey);
  const signature = signData(normalized, privateKey);

  const client = createFdmsClient(device.certificatePem, privateKey, device.deviceId.toString());
  const response: CloseDayResponse = await client.closeDay({
    fiscalDayDeviceSignature: signature,
    fiscalDayCounters: counters.map(c => ({
      fiscalCounterType: c.type,
      fiscalCounterCurrency: c.currency,
      fiscalCounterTaxPercent: c.taxPercent,
      fiscalCounterMoneyType: c.moneyType,
      fiscalCounterValue: c.value
    }))
  });

  await db.update(fiscalDays).set({
    status: "closed",
    closedAt: new Date(),
    summary: { totalSales, counterCount: counters.length },
    fdmsOperationId: response.operationID
  }).where(eq(fiscalDays.id, fiscalDay.id));

  return response;
}

/**
 * Submits a receipt to ZIMRA.
 */
export async function submitReceipt(id: string, receiptData: {
  receiptType: string;
  receiptCurrency: string;
  receiptGlobalNo: number;
  receiptDate: string;
  receiptTotal: number;
  taxes: Array<{
    taxID: number;
    taxCode: string;
    taxPercent: number;
    taxAmount: number;
    salesAmountWithTax: number;
  }>;
  items: any[];
}) {
  const device = (await db.select().from(devices).where(eq(devices.id, id))).at(0);
  if (!device || !device.certificatePem || !device.privateKey || !device.deviceId) {
    throw new Error("Device not active");
  }

  const privateKey = decrypt(device.privateKey);
  const prevHash = device.lastReceiptHash || "";
  const signature = generateReceiptSignature({
    deviceID: device.deviceId,
    ...receiptData,
    previousReceiptHash: prevHash,
  }, privateKey);

  const payload = {
    ...receiptData,
    deviceID: device.deviceId,
    receiptDeviceSignature: signature,
    previousReceiptHash: prevHash,
  };

  const client = createFdmsClient(device.certificatePem, privateKey, device.deviceId.toString());
  let response: SubmitReceiptResponse | SubmitFileResponse;
  let status: "submitted" | "pending" = "submitted";
  let fdmsOperationId: string | undefined;
  let fdmsReceiptUrl: string | undefined;

  try {
    if (device.mode === "offline") {
      const fileContent = Buffer.from(JSON.stringify([payload])).toString('base64');
      response = await client.submitFile({ fileType: "RECEIPTS", fileContent });
      fdmsOperationId = (response as SubmitFileResponse).operationID;
    } else {
      response = await client.submitReceipt(payload);
      fdmsOperationId = (response as SubmitReceiptResponse).operationID;
      fdmsReceiptUrl = (response as SubmitReceiptResponse).receiptQrCodeUrl;
    }
  } catch (error) {
    status = "pending";
  }

  const fiscalDay = (await db.select().from(fiscalDays).where(eq(fiscalDays.deviceId, id)).orderBy(desc(fiscalDays.openedAt))).at(0);
  if (!fiscalDay) throw new Error("No open fiscal day found");

  const [receipt] = await db.insert(receipts).values({
    deviceId: id,
    fiscalDayId: fiscalDay.id,
    receiptNo: receiptData.receiptGlobalNo.toString(),
    currency: receiptData.receiptCurrency,
    total: receiptData.receiptTotal,
    payload,
    previousReceiptHash: prevHash,
    fdmsOperationId,
    fdmsReceiptUrl,
    status: status === "submitted" ? "submitted" : "pending",
    submittedAt: status === "submitted" ? new Date() : undefined,
  }).returning();

  if (status === "submitted") {
    await db.update(devices).set({ lastReceiptHash: signature }).where(eq(devices.id, id));
  }

  return receipt;
}

/**
 * Submits a file payload to ZIMRA for a device.
 */
export async function submitFile(id: string, fileType: string, rawContent: string) {
  const device = (await db.select().from(devices).where(eq(devices.id, id))).at(0);
  if (!device || !device.certificatePem || !device.privateKey || !device.deviceId) {
    throw new Error("Device not active");
  }

  const privateKey = decrypt(device.privateKey);
  const client = createFdmsClient(device.certificatePem, privateKey, device.deviceId.toString());
  const fileContent = Buffer.from(rawContent).toString("base64");

  const response: SubmitFileResponse = await client.submitFile({
    fileType,
    fileContent,
  });

  return response;
}

type StoredReceiptPayload = {
  receiptDeviceSignature?: string;
};

/**
 * Attempts to resubmit pending receipts to FDMS.
 */
export async function processPendingReceipts() {
  const pendingReceipts = await db
    .select()
    .from(receipts)
    .where(eq(receipts.status, "pending"))
    .orderBy(asc(receipts.createdAt));

  if (pendingReceipts.length === 0) {
    return { processed: 0, failed: 0 };
  }

  const deviceCache = new Map<
    string,
    { device: typeof devices.$inferSelect; privateKey: string }
  >();

  let processed = 0;
  let failed = 0;

  for (const receipt of pendingReceipts) {
    const deviceId = receipt.deviceId;
    let cached = deviceCache.get(deviceId);

    if (!cached) {
      const device = (
        await db.select().from(devices).where(eq(devices.id, deviceId))
      ).at(0);

      if (!device || !device.certificatePem || !device.privateKey || !device.deviceId) {
        failed += 1;
        continue;
      }

      cached = { device, privateKey: decrypt(device.privateKey) };
      deviceCache.set(deviceId, cached);
    }

    const { device, privateKey } = cached;
    const client = createFdmsClient(
      device.certificatePem,
      privateKey,
      device.deviceId.toString(),
    );

    try {
      let fdmsOperationId: string | undefined;
      let fdmsReceiptUrl: string | undefined;

      if (device.mode === "offline") {
        const fileContent = Buffer.from(
          JSON.stringify([receipt.payload]),
        ).toString("base64");
        const response: SubmitFileResponse = await client.submitFile({
          fileType: "RECEIPTS",
          fileContent,
        });
        fdmsOperationId = response.operationID;
      } else {
        const response: SubmitReceiptResponse = await client.submitReceipt(
          receipt.payload,
        );
        fdmsOperationId = response.operationID;
        fdmsReceiptUrl = response.receiptQrCodeUrl;
      }

      await db
        .update(receipts)
        .set({
          status: "submitted",
          fdmsOperationId,
          fdmsReceiptUrl,
          submittedAt: new Date(),
        })
        .where(eq(receipts.id, receipt.id));

      processed += 1;

      const signature = (receipt.payload as StoredReceiptPayload)
        ?.receiptDeviceSignature;
      if (signature) {
        await db
          .update(devices)
          .set({ lastReceiptHash: signature })
          .where(eq(devices.id, device.id));
      }
    } catch (error) {
      console.error(error);
      failed += 1;
    }
  }

  return { processed, failed };
}
