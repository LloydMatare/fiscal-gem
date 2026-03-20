import forge from "node-forge";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.FDMS_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  throw new Error("FDMS_ENCRYPTION_KEY is not set");
}

/**
 * Generates an RSA key pair (private and public key).
 * @returns {Promise<{publicKey: string, privateKey: string}>} The generated key pair in PEM format.
 */
export async function generateKeyPair(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  return new Promise((resolve, reject) => {
    forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 }, (err, keypair) => {
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
 * @param {string} commonName The common name for the CSR (e.g., ZIMRA-SN001-12345).
 * @param {string} privateKeyPem The private key in PEM format.
 * @returns {string} The generated CSR in PEM format.
 */
export function generateCsr(commonName: string, privateKeyPem: string): string {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

  const csr = forge.pki.createCertificationRequest();
  csr.publicKey = privateKey.publicKey;
  csr.setSubject([{
    name: 'commonName',
    value: commonName
  }]);

  // Sign CSR with private key
  csr.sign(privateKey, forge.md.sha256.create());

  return forge.pki.certificationRequestToPem(csr);
}

/**
 * Generates a SHA-256 hash of the input string.
 * @param {string} input The string to hash.
 * @returns {string} The hex-encoded hash.
 */
export function sha256Hash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Signs data with RSA-SHA256 and returns Base64 encoded signature.
 * @param {string} data The data to sign.
 * @param {string} privateKeyPem The private key in PEM format.
 * @returns {string} The Base64 encoded signature.
 */
export function signData(data: string, privateKeyPem: string): string {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const md = forge.md.sha256.create();
  md.update(data, 'utf8');
  const signature = privateKey.sign(md);
  return forge.util.encode64(signature);
}

/**
 * Normalizes receipt data for signing.
 * Concatenates fields strictly (no separators).
 * @param {object} receipt The receipt data.
 * @returns {string} The normalized string.
 */
export function normalizeReceiptData(receipt: {
  deviceID: number;
  type: string;
  currency: string;
  globalNo: string;
  date: string;
  total: number;
  taxes: string; // concatenated tax amounts
  prevHash: string;
}): string {
  // Format numbers as per ZIMRA rules (e.g., 15.00 for tax percent)
  const formattedTotal = (receipt.total / 100).toFixed(2);
  return `${receipt.deviceID}${receipt.type}${receipt.currency}${receipt.globalNo}${receipt.date}${formattedTotal}${receipt.taxes}${receipt.prevHash}`;
}

/**
 * Generates receipt signature.
 * @param {object} receipt The receipt data.
 * @param {string} privateKeyPem The private key in PEM format.
 * @returns {string} The Base64 encoded signature.
 */
export function generateReceiptSignature(
  receipt: {
    deviceID: number;
    type: string;
    currency: string;
    globalNo: string;
    date: string;
    total: number;
    taxes: string;
    prevHash: string;
  },
  privateKeyPem: string,
): string {
  const normalized = normalizeReceiptData(receipt);
  const hash = sha256Hash(normalized);
  return signData(hash, privateKeyPem);
}

/**
 * Encrypts data using AES-256-GCM.
 * @param {string} text The text to encrypt.
 * @returns {string} The encrypted data as hex string (iv + tag + encrypted).
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY!, 'hex').subarray(0, 32), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts data encrypted with AES-256-GCM.
 * @param {string} encryptedText The encrypted data as hex string (iv + tag + encrypted).
 * @returns {string} The decrypted text.
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY!, 'hex').subarray(0, 32), iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
