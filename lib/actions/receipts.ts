"use server";

import { auth } from "@clerk/nextjs/server";
import { submitReceipt } from "@/lib/fdms/services";
import { db } from "@/lib/db";
import { devices, organizations, fiscalDays, receipts } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function submitReceiptAction(data: {
  deviceId: string;
  receiptType: string;
  receiptCurrency: string;
  items: Array<{
    description: string;
    quantity: number;
    price: number; // in cents
    taxCode: string; // "A", "B", etc.
  }>;
}) {
  const { orgId } = await auth();
  if (!orgId) throw new Error("Unauthorized");

  // 1. Get organization
  const org = (await db.select().from(organizations).where(eq(organizations.clerkOrgId, orgId))).at(0);
  if (!org) throw new Error("Organization not found");

  // 2. Get device and verify it belongs to org
  const device = (await db.select().from(devices).where(and(eq(devices.id, data.deviceId), eq(devices.organizationId, org.id)))).at(0);
  if (!device) throw new Error("Device not found or unauthorized");

  // 3. Get currently open fiscal day
  const fiscalDay = (await db.select().from(fiscalDays)
    .where(and(eq(fiscalDays.deviceId, device.id), eq(fiscalDays.status, "open")))
    .orderBy(desc(fiscalDays.openedAt))).at(0);
    
  if (!fiscalDay) throw new Error("No open fiscal day. Please open a day before submitting receipts.");

  // 4. Calculate totals and taxes using device config
  let subtotal = 0;
  let totalTax = 0;
  
  const taxesMap = new Map<string, { taxID: number, taxCode: string, taxPercent: number, taxAmount: number, salesAmountWithTax: number }>();

  // Use taxRates from device or fallback
  const deviceTaxRates = (device.taxRates as any[]) || [{ taxID: 1, taxCode: "A", taxPercent: 15.00 }];

  data.items.forEach(item => {
    const itemTotal = item.price * item.quantity;
    
    // Find matching tax rate from device config
    const rateConfig = deviceTaxRates.find(r => r.taxCode === item.taxCode) || { taxID: 1, taxPercent: 15.00 };
    const taxPercent = Number(rateConfig.taxPercent);
    const taxAmount = Math.round(itemTotal * (taxPercent / 100));
    const totalWithTax = itemTotal + taxAmount;

    subtotal += itemTotal;
    totalTax += taxAmount;

    const existing = taxesMap.get(item.taxCode) || { 
      taxID: rateConfig.taxID, 
      taxCode: item.taxCode, 
      taxPercent, 
      taxAmount: 0, 
      salesAmountWithTax: 0 
    };
    existing.taxAmount += taxAmount;
    existing.salesAmountWithTax += totalWithTax;
    taxesMap.set(item.taxCode, existing);
  });

  const total = subtotal + totalTax;

  // 5. Build ZIMRA receipt data
  const lastReceipt = (await db.select().from(receipts).where(eq(receipts.deviceId, device.id)).orderBy(desc(receipts.createdAt))).at(0);
  const nextGlobalNo = (parseInt(lastReceipt?.receiptNo || "0") + 1);

  const zimraData = {
    receiptType: data.receiptType,
    receiptCurrency: data.receiptCurrency,
    receiptGlobalNo: nextGlobalNo,
    receiptDate: new Date().toISOString().substring(0, 19), // YYYY-MM-DDTHH:mm:ss
    receiptTotal: total,
    taxes: Array.from(taxesMap.values()),
    items: data.items.map(i => {
      const itemTotal = i.price * i.quantity;
      const rateConfig = deviceTaxRates.find(r => r.taxCode === i.taxCode) || { taxPercent: 15.00 };
      const taxPercent = Number(rateConfig.taxPercent);
      const taxAmount = Math.round(itemTotal * (taxPercent / 100));
      
      return {
        receiptItemName: i.description,
        receiptItemQuantity: i.quantity,
        receiptItemPrice: i.price,
        receiptItemTotal: itemTotal + taxAmount
      };
    })
  };

  // 6. Call service
  try {
    const receipt = await submitReceipt(device.id, zimraData);
    revalidatePath("/receipts");
    return { success: true, receiptId: receipt.id };
  } catch (error: any) {
    console.error("Receipt submission error:", error);
    return { success: false, error: error.message };
  }
}
