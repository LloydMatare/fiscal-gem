"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import QRCode from "qrcode";

// Inline MD5 implementation (ZIMRA reference)
function md5(input: string): string {
  const hex = (b: number): string => b.toString(16).padStart(2, "0");
  const wordsToHex = (a: number, b: number, c: number, d: number) => {
    const toHex = (n: number) => {
      let s = "";
      for (let i = 0; i < 4; i++) s += hex((n >>> (i * 8)) & 0xff);
      return s;
    };
    return toHex(a) + toHex(b) + toHex(c) + toHex(d);
  };
  const bytes = new TextEncoder().encode(input);
  const msgLen = bytes.length;
  const totalBits = msgLen * 8;
  const padLen =
    msgLen % 64 < 56 ? 56 - (msgLen % 64) : 120 - (msgLen % 64);
  const padded = new Uint8Array(msgLen + padLen + 8);
  padded.set(bytes);
  padded[msgLen] = 0x80;
  for (let i = 0; i < 8; i++)
    padded[msgLen + padLen + i] = (totalBits / Math.pow(2, i * 8)) & 0xff;

  let a0 = 0x67452301,
    b0 = 0xefcdab89,
    c0 = 0x98badcfe,
    d0 = 0x10325476;

  function add32(x: number, y: number): number {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }
  function rotl(x: number, n: number): number {
    return (x << n) | (x >>> (32 - n));
  }
  function not32(x: number): number {
    return x ^ 0xffffffff;
  }
  function md5f(
    a: number, b: number, c: number, d: number,
    x: number, s: number, t: number
  ) {
    const v = add32(add32(a, (b & c) | (not32(b) & d)), add32(x, t));
    return add32(rotl(v, s), b);
  }
  function md5g(
    a: number, b: number, c: number, d: number,
    x: number, s: number, t: number
  ) {
    const v = add32(add32(a, (b & d) | (c & not32(d))), add32(x, t));
    return add32(rotl(v, s), b);
  }
  function md5h(
    a: number, b: number, c: number, d: number,
    x: number, s: number, t: number
  ) {
    const v = add32(add32(a, b ^ c ^ d), add32(x, t));
    return add32(rotl(v, s), b);
  }
  function md5i(
    a: number, b: number, c: number, d: number,
    x: number, s: number, t: number
  ) {
    const v = add32(add32(a, c ^ (b | not32(d))), add32(x, t));
    return add32(rotl(v, s), b);
  }

  const getWord = (offset: number) =>
    padded[offset] |
    (padded[offset + 1] << 8) |
    (padded[offset + 2] << 16) |
    (padded[offset + 3] << 24);

  for (let offset = 0; offset < padded.length; offset += 64) {
    const w = Array.from({ length: 16 }, (_, i) => getWord(offset + i * 4));
    let a = a0,
      b = b0,
      c = c0,
      d = d0;

    a = md5f(a, b, c, d, w[0], 7, 0xd76aa478);
    d = md5f(d, a, b, c, w[1], 12, 0xe8c7b756);
    c = md5f(c, d, a, b, w[2], 17, 0x242070db);
    b = md5f(b, c, d, a, w[3], 22, 0xc1bdceee);
    a = md5f(a, b, c, d, w[4], 7, 0xf57c0faf);
    d = md5f(d, a, b, c, w[5], 12, 0x4787c62a);
    c = md5f(c, d, a, b, w[6], 17, 0xa8304613);
    b = md5f(b, c, d, a, w[7], 22, 0xfd469501);
    a = md5f(a, b, c, d, w[8], 7, 0x698098d8);
    d = md5f(d, a, b, c, w[9], 12, 0x8b44f7af);
    c = md5f(c, d, a, b, w[10], 17, 0xffff5bb1);
    b = md5f(b, c, d, a, w[11], 22, 0x895cd7be);
    a = md5f(a, b, c, d, w[12], 7, 0x6b901122);
    d = md5f(d, a, b, c, w[13], 12, 0xfd987193);
    c = md5f(c, d, a, b, w[14], 17, 0xa679438e);
    b = md5f(b, c, d, a, w[15], 22, 0x49b40821);

    a = md5g(a, b, c, d, w[1], 5, 0xf61e2562);
    d = md5g(d, a, b, c, w[6], 9, 0xc040b340);
    c = md5g(c, d, a, b, w[11], 14, 0x265e5a51);
    b = md5g(b, c, d, a, w[0], 20, 0xe9b6c7aa);
    a = md5g(a, b, c, d, w[5], 5, 0xd62f105d);
    d = md5g(d, a, b, c, w[10], 9, 0x02441453);
    c = md5g(c, d, a, b, w[15], 14, 0xd8a1e681);
    b = md5g(b, c, d, a, w[4], 20, 0xe7d3fbc8);
    a = md5g(a, b, c, d, w[9], 5, 0x21e1cde6);
    d = md5g(d, a, b, c, w[14], 9, 0xc33707d6);
    c = md5g(c, d, a, b, w[3], 14, 0xf4d50d87);
    b = md5g(b, c, d, a, w[8], 20, 0x455a14ed);
    a = md5g(a, b, c, d, w[13], 5, 0xa9e3e905);
    d = md5g(d, a, b, c, w[2], 9, 0xfcefa3f8);
    c = md5g(c, d, a, b, w[7], 14, 0x676f02d9);
    b = md5g(b, c, d, a, w[12], 20, 0x8d2a4c8a);

    a = md5h(a, b, c, d, w[5], 4, 0xfffa3942);
    d = md5h(d, a, b, c, w[8], 11, 0x8771f681);
    c = md5h(c, d, a, b, w[11], 16, 0x6d9d6122);
    b = md5h(b, c, d, a, w[14], 23, 0xfde5380c);
    a = md5h(a, b, c, d, w[1], 4, 0xa4beea44);
    d = md5h(d, a, b, c, w[4], 11, 0x4bdecfa9);
    c = md5h(c, d, a, b, w[7], 16, 0xf6bb4b60);
    b = md5h(b, c, d, a, w[10], 23, 0xbebfbc70);
    a = md5h(a, b, c, d, w[13], 4, 0x289b7ec6);
    d = md5h(d, a, b, c, w[0], 11, 0xeaa127fa);
    c = md5h(c, d, a, b, w[3], 16, 0xd4ef3085);
    b = md5h(b, c, d, a, w[6], 23, 0x04881d05);
    a = md5h(a, b, c, d, w[9], 4, 0xd9d4d039);
    d = md5h(d, a, b, c, w[12], 11, 0xe6db99e5);
    c = md5h(c, d, a, b, w[15], 16, 0x1fa27cf8);
    b = md5h(b, c, d, a, w[2], 23, 0xc4ac5665);

    a = md5i(a, b, c, d, w[0], 6, 0xf4292244);
    d = md5i(d, a, b, c, w[7], 10, 0x432aff97);
    c = md5i(c, d, a, b, w[14], 15, 0xab9423a7);
    b = md5i(b, c, d, a, w[5], 21, 0xfc93a039);
    a = md5i(a, b, c, d, w[12], 6, 0x655b59c3);
    d = md5i(d, a, b, c, w[3], 10, 0x8f0ccc92);
    c = md5i(c, d, a, b, w[10], 15, 0xffeff47d);
    b = md5i(b, c, d, a, w[1], 21, 0x85845dd1);
    a = md5i(a, b, c, d, w[8], 6, 0x6fa87e4f);
    d = md5i(d, a, b, c, w[15], 10, 0xfe2ce6e0);
    c = md5i(c, d, a, b, w[6], 15, 0xa3014314);
    b = md5i(b, c, d, a, w[13], 21, 0x4e0811a1);
    a = md5i(a, b, c, d, w[4], 6, 0xf7537e82);
    d = md5i(d, a, b, c, w[11], 10, 0xbd3af235);
    c = md5i(c, d, a, b, w[2], 15, 0x2ad7d2bb);
    b = md5i(b, c, d, a, w[9], 21, 0xeb86d391);

    a0 = add32(a, a0);
    b0 = add32(b, b0);
    c0 = add32(c, c0);
    d0 = add32(d, d0);
  }
  return wordsToHex(a0, b0, c0, d0);
}

export interface ReceiptRecord {
  id: string;
  clientId: string;
  deviceId: string;
  shopId: string | null;
  fiscalDayNo: number | null;
  receiptGlobalNo: number | null;
  receiptCounter: number | null;
  receiptType: string | null;
  invoiceNo: string | null;
  externalReference: string | null;
  receiptNumber: string | null;
  fiscalPayloadJson: string | null;
  fdmsResponseJson: string | null;
  fdmsServerSignatureHash: string | null;
  fdmsServerSignature: string | null;
  status: string | null;
  receivedAt: string | null;
  fiscalisedAt: string | null;
}

interface DeviceInfo {
  deviceId: number | null;
  serialNumber: string | null;
  deviceModelName: string | null;
}

function qrToSvgPath(qr: QRCode.QRCode): string {
  const modules = qr.modules;
  const size = modules.size;
  let path = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (modules.get(x, y)) {
        path += `M${x},${y}h1v1h-1z`;
      }
    }
  }
  return path;
}

async function buildReceiptData(
  receipt: ReceiptRecord,
  device: DeviceInfo,
  deviceConfig: any
) {
  let fiscalPayload: any = {};
  try {
    fiscalPayload = JSON.parse(receipt.fiscalPayloadJson || "{}");
  } catch {}
  const r = fiscalPayload?.receipt || {};

  let fdmsResponse: any = null;
  try {
    fdmsResponse = JSON.parse(receipt.fdmsResponseJson || "null");
  } catch {}

  // Extract seller info from device config
  const seller = {
    companyName:
      deviceConfig?.taxpayerName || deviceConfig?.companyName || "",
    tradeName:
      deviceConfig?.taxpayerTradeName || deviceConfig?.tradeName || "",
    tin: deviceConfig?.taxpayerTIN || deviceConfig?.tin || "",
    vatNumber:
      deviceConfig?.taxpayerVATNumber || deviceConfig?.vatNumber || "",
    branchName: deviceConfig?.deviceBranchName || "",
    address:
      [
        deviceConfig?.deviceBranchAddress?.houseNo,
        deviceConfig?.deviceBranchAddress?.street,
        deviceConfig?.deviceBranchAddress?.city,
        deviceConfig?.deviceBranchAddress?.province,
      ]
        .filter(Boolean)
        .join(", ") || "",
    email: deviceConfig?.deviceBranchContacts?.email || "",
    phone: deviceConfig?.deviceBranchContacts?.phoneNo || "",
  };

  // Extract buyer info
  const buyerRaw = r.buyerData || r.buyer || null;
  let buyer = null;
  if (buyerRaw) {
    const addr = buyerRaw.buyerAddress || {};
    const contact = buyerRaw.buyerContacts || {};
    buyer = {
      registerName: buyerRaw.buyerRegisterName || buyerRaw.name || "",
      tradeName: buyerRaw.buyerTradeName || "",
      tin: buyerRaw.buyerTIN || buyerRaw.tin || "",
      vatNumber: buyerRaw.VATNumber || buyerRaw.vatNumber || "",
      address: [addr.houseNo, addr.street, addr.city, addr.province]
        .filter(Boolean)
        .join(", "),
      email: contact.email || "",
      phone: contact.phoneNo || contact.phone || "",
    };
  }

  // Build lines
  const rawLines = r.receiptLines || r.lines || [];
  const lines = rawLines.map((l: any, i: number) => {
    const taxPercent = l.taxPercent ?? l.taxRate ?? 0;
    const totalInclTax = l.receiptLineTotal || l.totalPrice || 0;
    return {
      lineNo: l.receiptLineNo || i + 1,
      lineType: l.receiptLineType || "Sale",
      hsCode: l.receiptLineHSCode || l.articleCode || "",
      name: l.receiptLineName || l.articleName || "",
      quantity: l.receiptLineQuantity || l.quantity || 0,
      unitPrice: l.receiptLinePrice || l.unitPrice || 0,
      totalPrice: l.receiptLineTotal || l.totalPrice || 0,
      taxCode: l.taxCode || "",
      taxPercent,
      taxAmount: l.taxAmount || 0,
      totalInclTax,
    };
  });

  // Build taxes
  const rawTaxes = r.receiptTaxes || r.taxes || [];
  const taxes = rawTaxes.map((t: any) => ({
    taxCode: t.taxCode || "",
    taxPercent: t.taxPercent ?? t.taxRate ?? 0,
    taxAmount: t.taxAmount || 0,
    salesAmountWithTax: t.salesAmountWithTax || 0,
  }));

  // Build payments
  const rawPayments = r.receiptPayments || r.payments || [];
  const payments = rawPayments.map((p: any) => ({
    paymentType: p.moneyTypeCode || p.paymentType || "Cash",
    paymentAmount: p.paymentAmount || 0,
  }));

  // === QR CODE per ZIMRA spec ===
  const deviceId = device.deviceId || 0;
  const receiptGlobalNo = receipt.receiptGlobalNo || 0;
  const receiptDate = r.receiptDate || receipt.receivedAt || "";
  const qrUrlBase = deviceConfig?.qrUrl || "https://fdmstest.zimra.co.zw";

  // Get signature from receiptDeviceSignature (inside fiscal payload)
  const deviceSig = (r.receiptDeviceSignature ?? {}) as Record<
    string,
    unknown
  >;
  const sigBase64 = String(deviceSig.signature ?? "");

  // Also try fdmsResponse signature as fallback
  const fdmsSig = fdmsResponse?.Signature || "";
  const signatureB64 = sigBase64 || fdmsSig;

  // Build verification code from hex signature (matches ZIMRA format)
  let verificationCode = "";
  let hexSignature = "";
  let receiptQrData = "";

  if (signatureB64) {
    try {
      const rawBytes = new Uint8Array(
        atob(signatureB64)
          .split("")
          .map((c) => c.charCodeAt(0))
      );
      hexSignature = Array.from(rawBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      // MD5 of the hex string, first 16 chars uppercase
      const md5Hash = md5(hexSignature.toUpperCase());
      receiptQrData = md5Hash.substring(0, 16).toUpperCase();
      // Full MD5 hash for verification
      verificationCode = md5Hash.toUpperCase();

      console.log("=== QR Code Debug ===");
      console.log("Signature (base64):", signatureB64);
      console.log("Hex:", hexSignature.toUpperCase());
      console.log("MD5:", verificationCode);
      console.log("First 16:", receiptQrData);
    } catch {}
  }

  // Build QR code URL: {qrUrl}/{deviceId10}/{date8ddMMyyyy}/{globalNo10}/{receiptQrData16}
  let qrCodeUrl = "";
  let qrCodeSvgPath: string | null = null;

  if (receiptQrData && deviceId && receiptGlobalNo) {
    try {
      const dId = String(deviceId).padStart(10, "0");
      let dateStr = "00000000";
      if (receiptDate) {
        const match = receiptDate.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
          dateStr = `${match[3]}${match[2]}${match[1]}`;
        } else {
          const d = new Date(receiptDate);
          const dd = String(d.getDate()).padStart(2, "0");
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const yyyy = String(d.getFullYear());
          dateStr = dd + mm + yyyy;
        }
      }
      const gNo = String(receiptGlobalNo).padStart(10, "0");

      const base = qrUrlBase.replace(/\/+$/, "");
      qrCodeUrl = `${base}/${dId}${dateStr}${gNo}${receiptQrData}`;

      console.log("=== QR Code URL ===");
      console.log("Device ID:", dId);
      console.log("Date:", dateStr);
      console.log("Global No:", gNo);
      console.log("QR Data:", receiptQrData);
      console.log("Full URL:", qrCodeUrl);

      const qr = QRCode.create(qrCodeUrl, {
        errorCorrectionLevel: "M",
      });
      qrCodeSvgPath = qrToSvgPath(qr);
    } catch {}
  }

  return {
    receiptGlobalNo: receipt.receiptGlobalNo,
    receiptCounter: receipt.receiptCounter,
    invoiceNo: receipt.invoiceNo,
    receiptType: receipt.receiptType,
    fiscalDayNo: receipt.fiscalDayNo,
    receiptDate: r.receiptDate || null,
    receiptTime: r.receiptTime || null,
    receiptCurrency: r.receiptCurrency || null,
    receiptTotal: r.receiptTotal || null,
    receiptNotes: r.receiptNotes || null,
    receiptPrintForm: r.receiptPrintForm || "Receipt48",
    username: r.username || null,
    operatorId: r.operatorId || null,
    seller,
    buyer,
    lines,
    taxes,
    payments,
    deviceId,
    deviceSerialNo: device.serialNumber || "",
    qrCodeSvgPath,
    verificationCode,
    verifyUrl: qrCodeUrl,
  };
}

export function PdfReceiptDownloadButton({
  receipt,
  device,
  deviceConfig,
}: {
  receipt: ReceiptRecord;
  device: DeviceInfo;
  deviceConfig?: any;
}) {
  const [loading, setLoading] = useState(false);
  const isFiscalised = receipt.status === "FISCALISED";

  const handleDownload = async () => {
    setLoading(true);
    try {
      const { PdfReceiptDocument } = await import("./pdf-receipt-document");
      const { pdf } = await import("@react-pdf/renderer");

      const data = await buildReceiptData(receipt, device, deviceConfig);
      const doc = <PdfReceiptDocument data={data as any} />;
      const blob = await pdf(doc).toBlob();

      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `receipt-${receipt.receiptGlobalNo || receipt.id}.pdf`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={loading || !isFiscalised}
      title={!isFiscalised ? "Receipt must be FISCALISED to download PDF" : undefined}
    >
      <Download className="h-4 w-4 mr-1.5" />
      {loading ? "Generating..." : "Download PDF"}
    </Button>
  );
}
