# Phase 5: ZIMRA FDMS Integration

**Status:** ✅ Complete

## Objective

Port the ZIMRA Fiscal Device Management System (FDMS) integration layer from Spring Boot's RestClient + mTLS to Node.js fetch + https.Agent mTLS.

## Architecture

```
Next.js API Route
    │
    ▼
fdmsRequest<T>()     ← Generic typed request helper
    │
    ├── createMtlsAgent()  ← Per-device HTTPS agent with client cert
    │
    ▼
ZIMRA FDMS API (https://fdmsapitest.zimra.co.zw)
```

## Files

| File | Purpose |
|---|---|
| `src/integration/zimra/config.ts` | Base URL + API path constants |
| `src/integration/zimra/client.ts` | Generic FDMS client + mTLS + error handling |
| `src/integration/zimra/device.ts` | Device APIs (10 functions) |
| `src/integration/zimra/receipt.ts` | Receipt submission API |
| `src/integration/zimra/public-api.ts` | Public APIs (server cert, taxpayer verify) |
| `src/integration/zimra/index.ts` | Barrel export |

## mTLS Client (src/integration/zimra/client.ts)

### createMtlsAgent
```typescript
function createMtlsAgent(options: {
  certificatePem: string;
  privateKeyPem: string;
}): https.Agent
```
Creates a Node.js HTTPS agent with per-device client certificate for mutual TLS authentication with ZIMRA.

### fdmsRequest\<T\>
```typescript
async function fdmsRequest<T>(options: {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;           // Path with {deviceID} placeholder
  deviceId: number;
  deviceModelName: string;
  deviceModelVersion: string;
  certificatePem?: string;
  privateKeyPem?: string;
  body?: unknown;
  contentType?: string;
  queryParams?: Record<string, string>;
  multipartFormData?: FormData;
}): Promise<T>
```

**Features:**
- Path parameter substitution (`{deviceID}` → actual ID)
- Automatic mTLS agent when certificates provided
- Structured error parsing (FDMS returns ProblemDetails-style errors)
- Throws `FdmsApiException` on non-2xx responses
- Handles both JSON and raw text responses

### FdmsApiException
```typescript
class FdmsApiException extends Error {
  status: number;        // HTTP status or FDMS status
  title: string;         // Error title
  detail: string;        // Error detail / validation errors
  errorCode?: string;    // FDMS error code
  operationId?: string;  // ZIMRA operation ID for tracking
}
```

## Device APIs (src/integration/zimra/device.ts)

| Function | Path | Method | Auth |
|---|---|---|---|
| `registerDevice()` | `/Public/v1/{id}/RegisterDevice` | POST | None (public) |
| `getDeviceConfig()` | `/Device/v1/{id}/GetConfig` | GET | mTLS |
| `getDeviceStatus()` | `/Device/v1/{id}/GetStatus` | GET | mTLS |
| `issueCertificate()` | `/Device/v1/{id}/IssueCertificate` | POST | mTLS |
| `openDay()` | `/Device/v1/{id}/OpenDay` | POST | mTLS |
| `closeDay()` | `/Device/v1/{id}/CloseDay` | POST | mTLS |
| `pingDevice()` | `/Device/v1/{id}/Ping` | POST | mTLS |
| `submitFile()` | `/Device/v1/{id}/SubmitFile` | POST | mTLS (multipart) |
| `submittedFileList()` | `/Device/v1/{id}/SubmittedFileList` | GET | mTLS |

### Key Request/Response Types

**OpenDayRequest:**
```json
{
  "ReceiptNo": 1,
  "OpenDate": "2026-07-21",
  "OpenTime": "08:00:00",
  "OperatorId": "optional",
  "ReconciliationMode": "STANDARD"
}
```

**CloseDayRequest:**
```json
{
  "ReceiptNo": 100,
  "CloseDate": "2026-07-21",
  "CloseTime": "17:00:00",
  "OperatorId": "optional",
  "ReconciliationMode": "STANDARD"
}
```

**CloseDayResponse:**
```json
{
  "OperationId": "string",
  "DeviceId": 12345,
  "ReceiptNo": 100,
  "TimeStamp": "string",
  "CloseFiscalDaySignature": "base64",
  "CloseFiscalDaySignatureHash": "base64"
}
```

## Receipt API (src/integration/zimra/receipt.ts)

**submitReceipt()** sends a signed receipt to ZIMRA:
```
POST /Device/v1/{deviceID}/SubmitReceipt
Content-Type: application/json
DeviceModelName: ...
DeviceModelVersion: ...
```

**SubmitReceiptRequest:**
```json
{
  "receipt": {
    "receiptGlobalNo": 1,
    "receiptCounter": 1,
    "receiptType": "STANDARD",
    "invoiceNo": "INV-001",
    "externalReference": "EXT-001",
    "receiptDate": "2026-07-21",
    "receiptTime": "10:30:00",
    "previousReceiptHash": "base64",
    "lines": [...],
    "payments": [...],
    "taxes": [...],
    "buyer": { ... },
    "signatureData": { "signedData": "...", "signature": "..." }
  }
}
```

**SubmitReceiptResponse:**
```json
{
  "OperationId": "string",
  "DeviceId": 12345,
  "ReceiptId": 67890,
  "ReceiptGlobalNo": 1,
  "ReceiptServerDate": "2026-07-21",
  "ReceiptServerTime": "10:30:05",
  "Signature": "base64",
  "SignatureHash": "base64",
  "SignatureThumbprint": "hex"
}
```

## Public APIs (src/integration/zimra/public-api.ts)

| Function | Path | Method |
|---|---|---|
| `getServerCertificate()` | `/Public/v1/GetServerCertificate` | GET |
| `verifyTaxpayerInformation()` | `/Public/v1/{id}/VerifyTaxpayerInformation` | POST |

## Error Handling Pattern

FDMS returns errors in this format:
```json
{
  "status": 400,
  "title": "Validation Error",
  "detail": "field1: error1; field2: error2",
  "errorCode": "FDMS-001",
  "operationID": "guid",
  "errors": { "FieldName": ["error message"] }
}
```

The `fdmsRequest` function parses this into `FdmsApiException` with structured fields.

## Spring Boot → Node.js Mapping

| Spring Boot | Node.js |
|---|---|
| `RestClient.builder().build()` | `fetch()` with `https.Agent` |
| `FdmsMtlsRestClientFactory.build(cert, key)` | `createMtlsAgent({ certificatePem, privateKeyPem })` |
| `RestClient.post().uri().body().retrieve()` | `fdmsRequest<T>({ method, path, body })` |
| `onStatus(status -> error)` | `if (!response.ok)` + `parseFdmsError()` |
| `MediaType.MULTIPART_FORM_DATA` | `FormData` with `Blob` |
| `LinkedMultiValueMap` | `new FormData()` |
