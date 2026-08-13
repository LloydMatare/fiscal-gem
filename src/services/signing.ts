import crypto from "crypto";

/**
 * Signs data using EC private key (SHA256withECDSA).
 * Replaces BouncyCastle-based ReceiptSigningService.
 */
export function signData(
  data: string,
  privateKeyPem: string
): { signature: string; signatureHash: string } {
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const buffer = Buffer.from(data, "utf-8");

  // Sign with ECDSA
  const signatureBuffer = crypto.sign(null, buffer, {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });

  const signature = signatureBuffer.toString("base64");
  const signatureHash = crypto
    .createHash("sha256")
    .update(signatureBuffer)
    .digest("base64");

  return { signature, signatureHash };
}

/**
 * Verifies a signature using the server's public key.
 * Replaces FdmsServerSignatureVerifier.
 */
export function verifySignature(
  data: string,
  signatureBase64: string,
  publicKeyPem: string
): boolean {
  try {
    const publicKey = crypto.createPublicKey(publicKeyPem);
    const dataBuffer = Buffer.from(data, "utf-8");
    const signatureBuffer = Buffer.from(signatureBase64, "base64");

    return crypto.verify(null, dataBuffer, publicKey, signatureBuffer);
  } catch {
    return false;
  }
}

/**
 * Generates a SHA-256 hash of the input data, returned as base64.
 */
export function sha256Base64(data: string): string {
  return crypto.createHash("sha256").update(data, "utf-8").digest("base64");
}

/**
 * Generates a SHA-256 hash of the input data, returned as hex.
 */
export function sha256Hex(data: string): string {
  return crypto.createHash("sha256").update(data, "utf-8").digest("hex");
}

/**
 * Computes the chain hash for receipt linking.
 * If there's a previous receipt, its hash is included.
 */
export function computeReceiptChainHash(
  currentPayload: string,
  previousReceiptHash?: string
): string {
  const data = previousReceiptHash
    ? `${previousReceiptHash}:${currentPayload}`
    : currentPayload;
  return sha256Base64(data);
}

/**
 * Extracts the device signature hash from a stored fiscal payload. The chain
 * value ZIMRA requires for `previousReceiptHash` is the previous receipt's
 * device signature `hash` field (NOT the FDMS server signature hash).
 */
export function getReceiptDeviceHash(
  fiscalPayloadJson: string | null | undefined
): string | undefined {
  if (!fiscalPayloadJson) return undefined;
  try {
    const payload = JSON.parse(fiscalPayloadJson);
    return payload?.receipt?.receiptDeviceSignature?.hash ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Converts an amount to cents as an integer string, exactly as ZIMRA requires
 * in the receipt signature concatenation (e.g. 2500.00 -> "250000", 0.05 -> "5",
 * -9450.00 -> "-945000").
 */
export function amountToCents(n: number): string {
  const abs = Math.round(Math.abs(n) * 100);
  return (n < 0 ? "-" : "") + String(abs);
}

/**
 * Formats a receipt date for the signature concatenation.
 * ZIMRA requires ISO 8601 <date>T<time> without seconds-precision surprises:
 * YYYY-MM-DDTHH:mm:ss (24h, local time). If the input already has a "T" it is
 * normalized to the second precision; otherwise it is returned as-is.
 */
export function formatReceiptDateForSignature(dateStr: string): string {
  const date = new Date(dateStr);
  if (!Number.isNaN(date.getTime())) {
    const pad = (v: number) => String(v).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
  return dateStr;
}

export interface ZimraReceiptSignatureInput {
  deviceID: number;
  receiptType: string;
  receiptCurrency: string;
  receiptGlobalNo: number;
  receiptDate: string;
  receiptTotal: number;
  receiptTaxes: Array<{
    taxCode?: string | null;
    taxPercent?: number | null;
    taxAmount: number;
    salesAmountWithTax: number;
  }>;
  previousReceiptHash?: string | null;
  isFirstInFiscalDay: boolean;
}

/**
 * Builds the canonical concatenated line that ZIMRA hashes and signs for the
 * receipt device signature (spec section 13.2.1). Field order matters and no
 * separator is used:
 *   deviceID || receiptType || receiptCurrency || receiptGlobalNo ||
 *   receiptDate || receiptTotal(cents) || taxes || previousReceiptHash
 * previousReceiptHash is omitted when the receipt is the first in its fiscal day.
 */
export function buildZimraReceiptSignatureLine(
  input: ZimraReceiptSignatureInput
): string {
  const type = input.receiptType.toUpperCase().replace(/_/g, "");
  const currency = input.receiptCurrency.toUpperCase();

  const taxes = [...input.receiptTaxes]
    .sort(
      (a, b) =>
        ((a as any).taxID ?? 0) - ((b as any).taxID ?? 0) ||
        String(a.taxCode ?? "").localeCompare(String(b.taxCode ?? ""))
    )
    .map((t) => {
      const percent =
        t.taxPercent === null || t.taxPercent === undefined
          ? ""
          : t.taxPercent.toFixed(2);
      return `${t.taxCode ?? ""}${percent}${amountToCents(t.taxAmount)}${amountToCents(t.salesAmountWithTax)}`;
    })
    .join("");

  let line = `${String(input.deviceID)}${type}${currency}${String(input.receiptGlobalNo)}`;
  line += formatReceiptDateForSignature(input.receiptDate);
  line += amountToCents(input.receiptTotal);
  line += taxes;
  if (!input.isFirstInFiscalDay && input.previousReceiptHash) {
    line += input.previousReceiptHash;
  }
  return line;
}

/**
 * Generates the ZIMRA receipt device signature per spec 13.1/13.2.1.
 * Returns the SignatureData structure ZIMRA expects:
 *   { hash: SHA256(line) base64, signature: ECDSA-SHA256 over the hash, base64 }
 */
export function signReceiptDevice(
  input: ZimraReceiptSignatureInput,
  privateKeyPem: string,
  dsaEncoding: "ieee-p1363" | "der" = "der"
): { hash: string; signature: string } {
  const line = buildZimraReceiptSignatureLine(input);
  const hash = sha256Base64(line);
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const signature = crypto.sign(
    "sha256",
    Buffer.from(line, "utf-8"),
    { key: privateKey, dsaEncoding }
  );
  return { hash, signature: signature.toString("base64") };
}

/**
 * Verifies a ZIMRA receipt device signature by recomputing the canonical line,
 * comparing the supplied hash, and verifying the ECDSA signature over the hash.
 * Accepts both DER and raw IEEE P1363 signature encodings.
 */
export function verifyReceiptDeviceSignature(
  input: ZimraReceiptSignatureInput,
  signature: { hash?: string | null; signature?: string | null },
  certificatePem: string
): { valid: boolean; reason?: string } {
  if (!signature?.signature) {
    return { valid: false, reason: "signature is missing" };
  }
  try {
    const line = buildZimraReceiptSignatureLine(input);
    const expectedHash = sha256Base64(line);
    if (signature.hash && signature.hash !== expectedHash) {
      return {
        valid: false,
        reason: `hash does not match (expected ${expectedHash})`,
      };
    }
    const publicKey = crypto.createPublicKey(certificatePem);
    const data = Buffer.from(line, "utf-8");
    const sigBytes = Buffer.from(signature.signature, "base64");

    for (const dsaEncoding of ["der", "ieee-p1363"] as const) {
      let valid = false;
      try {
        valid = crypto.verify(
          "sha256",
          data,
          { key: publicKey, dsaEncoding },
          sigBytes
        );
      } catch {}
      if (valid) return { valid: true };
    }
    return { valid: false, reason: "signature does not verify" };
  } catch (e) {
    return { valid: false, reason: (e as Error).message };
  }
}
