import forge from "node-forge";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.FDMS_ENCRYPTION_KEY;

/**
 * Generates an RSA key pair (private and public key).
 * @returns {Promise<{publicKey: string, privateKey: string}>} The generated key pair in PEM format.
 */
export async function generateKeyPair(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  return new Promise((resolve, reject) => {
    // Using 0 workers (synchronous) for more reliable behavior in some environments
    forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 0 }, (err, keypair) => {
      if (err) {
        return reject(err);
      }

      const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
      const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);

      resolve({ publicKey: publicKeyPem, privateKey: privateKeyPem });
    });
  });
}

/**
 * Generates a Certificate Signing Request (CSR).
 * @param {string} deviceId The zero-padded 10-digit device ID.
 * @param {string} serialNumber The manufacturer serial number.
 * @param {string} privateKeyPem The private key in PEM format.
 * @returns {string} The generated CSR in PEM format.
 */
export function generateCsr(deviceId: string, serialNumber: string, privateKeyPem: string): string {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem) as forge.pki.rsa.PrivateKey;
  
  // Create public key from private key if needed, or ensure it's available
  // node-forge's privateKeyFromPem might not always populate the publicKey property perfectly
  // if the PEM only contains the private part.
  const publicKey = forge.pki.setRsaPublicKey(privateKey.n, privateKey.e);

  const commonName = `ZIMRA-${serialNumber}-${deviceId.padStart(10, '0')}`;

  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = publicKey;
  csr.setSubject([
    { name: 'commonName', value: commonName },
    { name: 'countryName', value: 'ZW' },
    { name: 'organizationName', value: 'Zimbabwe Revenue Authority' },
    { name: 'stateOrProvinceName', value: 'Zimbabwe' }
  ]);

  // Sign CSR with private key
  csr.sign(privateKey, forge.md.sha256.create());

  return forge.pki.certificationRequestToPem(csr);
}

/**
 * Generates a SHA-256 hash of the input string and returns it in Base64.
 * @param {string} input The string to hash.
 * @returns {string} The Base64-encoded hash.
 */
export function sha256HashBase64(input: string): string {
  return crypto.createHash('sha256').update(input).digest('base64');
}

/**
 * Signs data with RSA-SHA256 and returns Base64 encoded signature.
 * @param {string} data The data to sign.
 * @param {string} privateKeyPem The private key in PEM format.
 * @returns {string} The Base64 encoded signature.
 */
export function signData(data: string, privateKeyPem: string): string {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem) as forge.pki.rsa.PrivateKey;
  const md = forge.md.sha256.create();
  md.update(data, 'utf8');
  const signature = privateKey.sign(md);
  return forge.util.encode64(signature);
}

/**
 * Formats a percentage for ZIMRA signatures (e.g. 15 -> "15.00").
 */
export function formatTaxPercent(percent: number): string {
  return percent.toFixed(2);
}

/**
 * Normalizes receipt data for signing as per ZIMRA v7.2 rules.
 */
export function normalizeReceiptData(receipt: {
  deviceID: number;
  receiptType: string;
  receiptCurrency: string;
  receiptGlobalNo: number;
  receiptDate: string; // YYYY-MM-DDTHH:mm:ss
  receiptTotal: number; // in cents
  taxes: Array<{
    taxID: number;
    taxCode: string;
    taxPercent: number;
    taxAmount: number; // in cents
    salesAmountWithTax: number; // in cents
  }>;
  previousReceiptHash?: string; // SHA256 (Base64)
}): string {
  // 1. Sort taxes by ID (ascending), then Code (alphabetical)
  const sortedTaxes = [...receipt.taxes].sort((a, b) => {
    if (a.taxID !== b.taxID) return a.taxID - b.taxID;
    return a.taxCode.localeCompare(b.taxCode);
  });

  // 2. Concatenate tax lines: taxCode || taxPercent || taxAmount || salesAmountWithTax
  const taxString = sortedTaxes.map(t => 
    `${t.taxCode}${formatTaxPercent(t.taxPercent)}${t.taxAmount}${t.salesAmountWithTax}`
  ).join('');

  // 3. Final concatenation: deviceID + type + currency + globalNo + date + total + taxes + prevHash
  return `${receipt.deviceID}${receipt.receiptType.toUpperCase()}${receipt.receiptCurrency.toUpperCase()}${receipt.receiptGlobalNo}${receipt.receiptDate}${receipt.receiptTotal}${taxString}${receipt.previousReceiptHash || ""}`;
}

/**
 * Generates receipt signature.
 */
export function generateReceiptSignature(
  receipt: Parameters<typeof normalizeReceiptData>[0],
  privateKeyPem: string,
): string {
  const normalized = normalizeReceiptData(receipt);
  // ZIMRA v7.2 says: "Sign the concatenated line"
  return signData(normalized, privateKeyPem);
}

/**
 * Encrypts data using AES-256-GCM.
 */
export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) throw new Error("FDMS_ENCRYPTION_KEY is not set");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex').subarray(0, 32), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts data encrypted with AES-256-GCM.
 */
export function decrypt(encryptedText: string): string {
  if (!ENCRYPTION_KEY) throw new Error("FDMS_ENCRYPTION_KEY is not set");
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex').subarray(0, 32), iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
