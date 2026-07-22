import crypto from "crypto";
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

export interface CsrResult {
  commonName: string;
  privateKeyPem: string;
  publicKeyPem: string;
  csrPem: string;
  csrPayload: string;
}

export interface UploadThingFile {
  url: string;
  name: string;
  size: number;
}

export interface KeyMaterialUrls {
  privateKeyUrl: string;
  publicKeyUrl: string;
  csrUrl: string;
  csrPayloadUrl: string;
  certificateUrl?: string;
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

  const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "P-256",
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

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

function buildCsrPem(
  privateKeyPem: string,
  publicKeyPem: string,
  commonName: string
): string {
  const privateKeyObj = crypto.createPrivateKey(privateKeyPem);
  const tbsCertificate = buildTbsCertificate(commonName, publicKeyPem);

  const signature = crypto.sign("SHA256", Buffer.from(tbsCertificate), {
    key: privateKeyObj,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
  });

  const der = buildCsrDer(tbsCertificate, signature, "SHA256withECDSA");
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
  _algorithm: string
): Buffer {
  return Buffer.from([...Buffer.from(tbsCertificate), ...signature]);
}

/**
 * Uploads key material to UploadThing and returns URLs.
 */
export async function uploadKeyMaterial(
  clientId: string,
  deviceId: number,
  keyMaterial: CsrResult
): Promise<KeyMaterialUrls> {
  const prefix = `${clientId}/${deviceId}`;

  const files = [
    new File([keyMaterial.privateKeyPem], `${prefix}/private-key.pem`, {
      type: "text/plain",
    }),
    new File([keyMaterial.publicKeyPem], `${prefix}/public-key.pem`, {
      type: "text/plain",
    }),
    new File([keyMaterial.csrPem], `${prefix}/csr.pem`, {
      type: "text/plain",
    }),
    new File([keyMaterial.csrPayload], `${prefix}/csr-payload.txt`, {
      type: "text/plain",
    }),
  ];

  const uploaded = await utapi.uploadFiles(files);

  return {
    privateKeyUrl: uploaded[0].data?.ufsUrl ?? "",
    publicKeyUrl: uploaded[1].data?.ufsUrl ?? "",
    csrUrl: uploaded[2].data?.ufsUrl ?? "",
    csrPayloadUrl: uploaded[3].data?.ufsUrl ?? "",
  };
}

/**
 * Uploads the device certificate PEM to UploadThing.
 */
export async function uploadCertificate(
  clientId: string,
  deviceId: number,
  certificatePem: string
): Promise<string> {
  const file = new File(
    [certificatePem],
    `${clientId}/${deviceId}/certificate.pem`,
    { type: "text/plain" }
  );

  const uploaded = await utapi.uploadFiles([file]);
  return uploaded[0].data?.ufsUrl ?? "";
}

/**
 * Downloads a file from a URL and returns its text content.
 */
export async function downloadFileAsText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download file: ${url}`);
  return res.text();
}

/**
 * Reads the certificate PEM from the DB or downloads private key from UploadThing.
 */
export async function readCertificatePem(
  certificatePem: string
): Promise<string> {
  return certificatePem;
}

export async function readPrivateKeyFromUrl(url: string): Promise<string> {
  return downloadFileAsText(url);
}

/**
 * Uploads multiple PEM files (private key, public key, CSR, certificate) in one batch.
 */
export async function uploadAllKeyMaterial(
  clientId: string,
  deviceId: number,
  keyMaterial: CsrResult,
  certificatePem: string
): Promise<KeyMaterialUrls> {
  const prefix = `${clientId}/${deviceId}`;

  const files = [
    new File([keyMaterial.privateKeyPem], `${prefix}/private-key.pem`, {
      type: "text/plain",
    }),
    new File([keyMaterial.publicKeyPem], `${prefix}/public-key.pem`, {
      type: "text/plain",
    }),
    new File([keyMaterial.csrPem], `${prefix}/csr.pem`, {
      type: "text/plain",
    }),
    new File([keyMaterial.csrPayload], `${prefix}/csr-payload.txt`, {
      type: "text/plain",
    }),
    new File([certificatePem], `${prefix}/certificate.pem`, {
      type: "text/plain",
    }),
  ];

  const uploaded = await utapi.uploadFiles(files);

  return {
    privateKeyUrl: uploaded[0].data?.ufsUrl ?? "",
    publicKeyUrl: uploaded[1].data?.ufsUrl ?? "",
    csrUrl: uploaded[2].data?.ufsUrl ?? "",
    csrPayloadUrl: uploaded[3].data?.ufsUrl ?? "",
    certificateUrl: uploaded[4].data?.ufsUrl ?? "",
  };
}
