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
