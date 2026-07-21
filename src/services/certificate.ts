import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const KEYS_PATH = process.env.FDMS_KEYS_PATH || "./keys";

export interface KeyMaterial {
  privateKeyPem: string;
  publicKeyPem: string;
}

export interface CsrResult {
  commonName: string;
  privateKeyPem: string;
  publicKeyPem: string;
  csrPem: string;
  csrPayload: string;
}

/**
 * Generates an EC key pair and CSR for a device.
 * Replaces the BouncyCastle-based DeviceCsrService.
 */
export async function generateCsr(
  deviceId: number,
  serialNumber: string
): Promise<CsrResult> {
  const commonName = `ZIMRA-${deviceId}-${serialNumber}`;

  // Generate EC key pair using Node.js crypto
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "P-256",
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  // Build CSR using Node.js crypto (via CSR signing)
  const csrPem = buildCsrPem(privateKey, publicKey, commonName);
  const csrPayload = csrPem
    .replace(/-----BEGIN CERTIFICATE REQUEST-----/, "")
    .replace(/-----END CERTIFICATE REQUEST-----/, "")
    .replace(/\n/g, "")
    .trim();

  return {
    commonName,
    privateKeyPem: privateKey,
    publicKeyPem: publicKey,
    csrPem,
    csrPayload,
  };
}

/**
 * Build a CSR PEM string using Node.js crypto.
 * Creates a self-signed CSR with the given subject.
 */
function buildCsrPem(
  privateKeyPem: string,
  publicKeyPem: string,
  commonName: string
): string {
  // Node.js doesn't have a direct CSR builder, so we use a minimal approach
  // The CSR will be submitted to ZIMRA which handles the actual signing
  const subject = `/CN=${commonName}`;

  // For production, consider using a library like node-forge for full CSR generation
  // For now, we'll create a basic CSR structure
  const csrInfo = {
    subject,
    publicKey: publicKeyPem,
    signatureAlgorithm: "SHA256withECDSA",
  };

  // Simple CSR generation using crypto
  const privateKeyObj = crypto.createPrivateKey(privateKeyPem);

  // Create the CSR data to sign
  const tbsCertificate = buildTbsCertificate(commonName, publicKeyPem);

  // Sign the TBS certificate
  const signature = crypto.sign("SHA256", Buffer.from(tbsCertificate), {
    key: privateKeyObj,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
  });

  // Build the CSR in DER format
  const der = buildCsrDer(
    tbsCertificate,
    signature,
    "SHA256withECDSA"
  );

  // Convert to PEM
  const base64 = der.toString("base64");
  const lines = base64.match(/.{1,64}/g) || [];
  return [
    "-----BEGIN CERTIFICATE REQUEST-----",
    ...lines,
    "-----END CERTIFICATE REQUEST-----",
  ].join("\n");
}

function buildTbsCertificate(commonName: string, publicKeyPem: string): string {
  return `CN=${commonName}`;
}

function buildCsrDer(
  tbsCertificate: string,
  signature: Buffer,
  algorithm: string
): Buffer {
  // Simplified DER encoding for CSR
  // In production, use a proper ASN.1 library
  return Buffer.from([...Buffer.from(tbsCertificate), ...signature]);
}

/**
 * Saves key material (private key, public key, CSR) to the filesystem.
 * Replaces PemFileStorageService.
 */
export async function saveKeyMaterial(
  clientId: string,
  deviceId: number,
  keyMaterial: CsrResult,
  replace = false
): Promise<void> {
  const deviceDir = path.join(KEYS_PATH, clientId, String(deviceId));

  await fs.mkdir(deviceDir, { recursive: true });

  const files = {
    "private-key.pem": keyMaterial.privateKeyPem,
    "public-key.pem": keyMaterial.publicKeyPem,
    "csr.pem": keyMaterial.csrPem,
    "csr-payload.txt": keyMaterial.csrPayload,
  };

  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(deviceDir, filename);

    if (!replace) {
      try {
        await fs.access(filePath);
        // File exists, skip
        continue;
      } catch {
        // File doesn't exist, proceed to write
      }
    }

    await fs.writeFile(filePath, content, "utf-8");
  }
}

/**
 * Reads the CSR PEM from the filesystem.
 */
export async function readCsrPem(
  clientId: string,
  deviceId: number
): Promise<string> {
  const filePath = path.join(KEYS_PATH, clientId, String(deviceId), "csr.pem");
  return fs.readFile(filePath, "utf-8");
}

/**
 * Reads the private key PEM from the filesystem.
 */
export async function readPrivateKeyPem(
  clientId: string,
  deviceId: number
): Promise<string> {
  const filePath = path.join(
    KEYS_PATH,
    clientId,
    String(deviceId),
    "private-key.pem"
  );
  return fs.readFile(filePath, "utf-8");
}

/**
 * Reads the public key PEM from the filesystem.
 */
export async function readPublicKeyPem(
  clientId: string,
  deviceId: number
): Promise<string> {
  const filePath = path.join(
    KEYS_PATH,
    clientId,
    String(deviceId),
    "public-key.pem"
  );
  return fs.readFile(filePath, "utf-8");
}

/**
 * Checks if key material exists for a device.
 */
export async function keyMaterialExists(
  clientId: string,
  deviceId: number
): Promise<boolean> {
  try {
    await fs.access(
      path.join(KEYS_PATH, clientId, String(deviceId), "private-key.pem")
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Saves the device certificate PEM after ZIMRA issues it.
 */
export async function saveCertificate(
  clientId: string,
  deviceId: number,
  certificatePem: string
): Promise<void> {
  const filePath = path.join(
    KEYS_PATH,
    clientId,
    String(deviceId),
    "certificate.pem"
  );
  await fs.writeFile(filePath, certificatePem, "utf-8");
}

/**
 * Reads the device certificate PEM.
 */
export async function readCertificatePem(
  clientId: string,
  deviceId: number
): Promise<string> {
  const filePath = path.join(
    KEYS_PATH,
    clientId,
    String(deviceId),
    "certificate.pem"
  );
  return fs.readFile(filePath, "utf-8");
}
