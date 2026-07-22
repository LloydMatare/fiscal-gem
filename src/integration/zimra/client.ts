import http from "http";
import https from "https";
import { FDMS_BASE_URL } from "./config";

export interface MtlsClientOptions {
  certificatePem: string;
  privateKeyPem: string;
}

/**
 * Creates an HTTPS agent with mTLS (mutual TLS) using per-device certificates.
 */
export function createMtlsAgent(options: MtlsClientOptions): https.Agent {
  return new https.Agent({
    cert: options.certificatePem,
    key: options.privateKeyPem,
    rejectUnauthorized: true,
    secureProtocol: "TLSv1_2_method",
  });
}

export interface FdmsRequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  deviceId: number;
  deviceModelName: string;
  deviceModelVersion: string;
  certificatePem?: string;
  privateKeyPem?: string;
  body?: unknown;
  contentType?: string;
  queryParams?: Record<string, string>;
  multipartFormData?: FormData;
}

export interface FdmsErrorResponse {
  status?: number;
  title?: string;
  detail?: string;
  errorCode?: string;
  operationID?: string;
  operationId?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
  rawBody?: string;
}

export class FdmsApiException extends Error {
  constructor(
    public status: number,
    public title: string,
    public detail: string,
    public errorCode?: string | null,
    public operationId?: string | null
  ) {
    super(`FDMS API Error ${status}: ${title} - ${detail}`);
    this.name = "FdmsApiException";
  }
}

/**
 * Makes an HTTPS request using Node.js `https.request` (supports mTLS via agent).
 * Node.js native `fetch()` (undici) ignores the `agent` option, so mTLS requires `https.request`.
 */
function httpsRequest(
  url: URL,
  options: {
    method: string;
    headers: Record<string, string>;
    agent?: https.Agent;
    body?: string | Buffer;
  }
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url.toString(),
      {
        method: options.method,
        headers: options.headers,
        agent: options.agent,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () =>
          resolve({ status: res.statusCode || 0, headers: res.headers, body: data })
        );
      }
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

/**
 * Generic FDMS API client that handles mTLS, error parsing, and response handling.
 * Uses `https.request` for mTLS calls (Node.js fetch ignores the agent option).
 */
export async function fdmsRequest<T>(
  options: FdmsRequestOptions
): Promise<T> {
  const {
    method,
    path,
    deviceId,
    deviceModelName,
    deviceModelVersion,
    certificatePem,
    privateKeyPem,
    body,
    contentType = "application/json",
    queryParams,
  } = options;

  // Build the URL with path parameter substitution
  const url = new URL(
    path.replace("{deviceID}", String(deviceId)),
    FDMS_BASE_URL
  );

  // Add query parameters
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    DeviceModelName: deviceModelName,
    DeviceModelVersion: deviceModelVersion,
  };

  let requestBody: string | Buffer | undefined;

  // Add body for POST/PUT/PATCH
  if (body && ["POST", "PUT", "PATCH"].includes(method)) {
    if (contentType === "multipart/form-data" && body instanceof FormData) {
      const buffer = await (body as any).arrayBuffer();
      requestBody = Buffer.from(buffer);
      headers["Content-Type"] = contentType;
    } else {
      headers["Content-Type"] = contentType;
      requestBody = typeof body === "string" ? body : JSON.stringify(body);
    }
  }

  // Use https.request for mTLS, fetch for non-mTLS
  let responseStatus: number;
  let responseHeaders: Record<string, string>;
  let responseText: string;

  if (certificatePem && privateKeyPem) {
    const agent = createMtlsAgent({ certificatePem, privateKeyPem });
    const result = await httpsRequest(url, {
      method,
      headers,
      agent,
      body: requestBody,
    });
    responseStatus = result.status;
    responseHeaders = result.headers as Record<string, string>;
    responseText = result.body;
  } else {
    const fetchOptions: RequestInit = { method, headers };
    if (requestBody) {
      fetchOptions.body = typeof requestBody === "string" ? requestBody : requestBody.toString();
    }
    const response = await fetch(url.toString(), fetchOptions);
    responseStatus = response.status;
    responseHeaders = Object.fromEntries(response.headers.entries());
    responseText = await response.text();
  }

  if (responseStatus < 200 || responseStatus >= 300) {
    const error = parseFdmsError(responseStatus, responseText, responseHeaders);
    throw new FdmsApiException(
      error.status ?? responseStatus,
      error.title ?? "FDMS request failed",
      error.detail ?? responseText,
      error.errorCode,
      error.operationID ?? error.operationId ?? error.traceId
    );
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    return responseText as unknown as T;
  }
}

function parseFdmsError(
  httpStatus: number,
  body: string,
  headers: Record<string, string>
): FdmsErrorResponse {
  try {
    if (!body.trim()) {
      return { status: httpStatus };
    }

    const root = JSON.parse(body);
    const operationId =
      root.operationID ||
      root.operationId ||
      root.traceId ||
      headers["operationid"] ||
      headers["operationID"];

    let detail = root.detail;
    if (!detail && root.errors) {
      detail = extractValidationErrors(root.errors);
    }
    if (!detail) {
      detail = body;
    }

    return {
      status: root.status ?? httpStatus,
      title: root.title ?? "FDMS request failed",
      detail,
      errorCode: root.errorCode,
      operationID: operationId,
      rawBody: body,
    };
  } catch {
    return { status: httpStatus, detail: body };
  }
}

function extractValidationErrors(errors: Record<string, any>): string {
  const parts: string[] = [];
  for (const [field, value] of Object.entries(errors)) {
    if (Array.isArray(value)) {
      parts.push(`${field}: ${value.join(", ")}`);
    } else {
      parts.push(`${field}: ${value}`);
    }
  }
  return parts.join("; ");
}
