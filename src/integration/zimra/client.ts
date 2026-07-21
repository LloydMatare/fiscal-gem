import tls from "tls";
import https from "https";
import { FDMS_BASE_URL } from "./config";

export interface MtlsClientOptions {
  certificatePem: string;
  privateKeyPem: string;
}

/**
 * Creates an HTTPS agent with mTLS (mutual TLS) using per-device certificates.
 * This replaces the Spring Boot FdmsMtlsRestClientFactory.
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
 * Generic FDMS API client that handles mTLS, error parsing, and response handling.
 * Replaces the Spring Boot RestClient-based FdmsServiceImpl.
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

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  // Add mTLS agent if certificates provided
  if (certificatePem && privateKeyPem) {
    (fetchOptions as any).agent = createMtlsAgent({
      certificatePem,
      privateKeyPem,
    });
  }

  // Add body for POST/PUT/PATCH
  if (body && ["POST", "PUT", "PATCH"].includes(method)) {
    if (contentType === "multipart/form-data" && body instanceof FormData) {
      fetchOptions.body = body;
    } else {
      headers["Content-Type"] = contentType;
      fetchOptions.body =
        typeof body === "string" ? body : JSON.stringify(body);
    }
  }

  const response = await fetch(url.toString(), fetchOptions);

  const responseText = await response.text();

  if (!response.ok) {
    const error = parseFdmsError(response.status, responseText, response.headers);
    throw new FdmsApiException(
      error.status ?? response.status,
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
  headers: Headers
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
      headers.get("operationID") ||
      headers.get("operationId");

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
