# Phase 6: Certificate Management

**Status:** ✅ Complete

## Objective

Port device certificate lifecycle management from BouncyCastle (Java) to Node.js `crypto` module. Handle EC key pair generation, CSR creation, PEM file storage, and cryptographic signing.

## Files

| File | Purpose |
|---|---|
| `src/services/certificate.ts` | EC key gen, CSR, PEM storage |
| `src/services/signing.ts` | ECDSA signing, verification, hashing |
| `src/services/index.ts` | Barrel export |

## Certificate Lifecycle

```
1. Device Registration
   └── generateCsr(deviceId, serialNumber)
       ├── Generate EC P-256 key pair
       ├── Build CSR with CN=ZIMRA-{deviceId}-{serialNumber}
       └── saveKeyMaterial() → keys/{clientId}/{deviceId}/
           ├── private-key.pem
           ├── public-key.pem
           ├── csr.pem
           └── csr-payload.txt (escaped single-line CSR)

2. Certificate Issuance
   └── ZIMRA signs the CSR, returns device certificate
   └── saveCertificate(clientId, deviceId, certPem)
       └── keys/{clientId}/{deviceId}/certificate.pem

3. mTLS Usage
   └── readCertificatePem() + readPrivateKeyPem()
       └── createMtlsAgent() → per-device HTTPS agent

4. Receipt Signing
   └── signData(payload, privateKeyPem)
       ├── ECDSA SHA256withECDSA
       └── Returns { signature: base64, signatureHash: base64 }
```

## Key Functions

### generateCsr(deviceId, serialNumber)

```typescript
async function generateCsr(deviceId: number, serialNumber: string): Promise<CsrResult>
```

**CsrResult:**
```typescript
{
  commonName: string;      // "ZIMRA-{deviceId}-{serialNumber}"
  privateKeyPem: string;   // EC P-256 private key PEM
  publicKeyPem: string;    // EC P-256 public key PEM
  csrPem: string;          // CSR in PEM format
  csrPayload: string;      // Base64 CSR without headers/newlines
}
```

**Implementation:**
- Uses `crypto.generateKeyPairSync("ec", { namedCurve: "P-256" })`
- Generates proper PEM-encoded key pair
- CSR built with ASN.1 encoding (simplified for ZIMRA compatibility)

### saveKeyMaterial(clientId, deviceId, keyMaterial, replace?)

```typescript
async function saveKeyMaterial(
  clientId: string,
  deviceId: number,
  keyMaterial: CsrResult,
  replace?: boolean
): Promise<void>
```

Saves to `keys/{clientId}/{deviceId}/`:
- `private-key.pem` — EC private key
- `public-key.pem` — EC public key
- `csr.pem` — Certificate signing request
- `csr-payload.txt` — Escaped single-line CSR for ZIMRA submission

If `replace=false`, existing files are preserved.

### Key Reading Functions

```typescript
async function readCsrPem(clientId: string, deviceId: number): Promise<string>
async function readPrivateKeyPem(clientId: string, deviceId: number): Promise<string>
async function readPublicKeyPem(clientId: string, deviceId: number): Promise<string>
async function readCertificatePem(clientId: string, deviceId: number): Promise<string>
async function saveCertificate(clientId: string, deviceId: number, certPem: string): Promise<void>
async function keyMaterialExists(clientId: string, deviceId: number): Promise<boolean>
```

## Signing Services (src/services/signing.ts)

### signData(data, privateKeyPem)

```typescript
function signData(data: string, privateKeyPem: string): {
  signature: string;       // Base64-encoded ECDSA signature
  signatureHash: string;   // SHA-256 hash of signature (base64)
}
```

Uses Node.js `crypto.sign()` with ECDSA (IEEE P1363 encoding).

### verifySignature(data, signatureBase64, publicKeyPem)

```typescript
function verifySignature(data: string, signatureBase64: string, publicKeyPem: string): boolean
```

### computeReceiptChainHash(currentPayload, previousReceiptHash?)

```typescript
function computeReceiptChainHash(
  currentPayload: string,
  previousReceiptHash?: string
): string  // Base64 SHA-256
```

Links receipts in a chain: `hash = SHA256(prevHash:currentPayload)`.

### Utility Hash Functions

```typescript
function sha256Base64(data: string): string  // SHA-256 → base64
function sha256Hex(data: string): string     // SHA-256 → hex
```

## Spring Boot → Node.js Mapping

| BouncyCastle (Java) | Node.js crypto |
|---|---|
| `ECKeyPairGeneratorService.generateKeyPair()` | `crypto.generateKeyPairSync("ec", { namedCurve: "P-256" })` |
| `JcaContentSignerBuilder("SHA256withECDSA")` | `crypto.sign(null, buffer, { key, dsaEncoding: "ieee-p1363" })` |
| `JcaPKCS10CertificationRequestBuilder` | Custom CSR builder (ASN.1 encoding) |
| `PemConverter.toPem(key)` | Manual PEM wrapping |
| `PemFileStorageService.save()` | `fs.writeFile()` |
| `MtlsSslContextFactory.build(cert, key)` | `new https.Agent({ cert, key })` |
