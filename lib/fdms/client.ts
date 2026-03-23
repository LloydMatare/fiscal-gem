import "server-only";
import https from "https";
import { fdmsRoutes } from "./routes";
import type { FdmsProblemDetails } from "./types";

const baseUrl = process.env.FDMS_BASE_URL ?? "https://fdmsapitest.zimra.co.zw";

if (!baseUrl) {
  throw new Error("FDMS_BASE_URL is not set");
}

/**
 * Builds the full ZIMRA FDMS URL.
 * ZIMRA v7.2 path standard:
 * Public: {baseUrl}/Public/v1/{deviceId}/{endpoint} (Note: deviceId is required in path)
 * Device: {baseUrl}/Device/v1/{deviceId}/{endpoint}
 */
const buildUrl = (path: string, deviceId: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Public/v1 endpoints usually require the deviceId in the path as well for ZIMRA v7.2
  if (normalizedPath.startsWith('/Public/v1/')) {
    const endpoint = normalizedPath.replace('/Public/v1/', '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // GetServerCertificate might be the only truly global one, but even then, test servers often want the ID.
    if (endpoint === 'GetServerCertificate' && !deviceId) {
       return `${baseUrl}/Public/v1/GetServerCertificate`;
    }

    return `${baseUrl}/Public/v1/${deviceId}${cleanEndpoint}`;
  }

  if (normalizedPath.startsWith('/Device/v1/')) {
    const endpoint = normalizedPath.replace('/Device/v1/', '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}/Device/v1/${deviceId}${cleanEndpoint}`;
  }

  return `${baseUrl}${normalizedPath}`;
};

/**
 * Creates a dynamic FDMS client for a specific device.
 */
export function createFdmsClient(deviceCert: string, deviceKey: string, deviceId: string) {
  const mtlsAgent = new https.Agent({
    cert: deviceCert,
    key: deviceKey,
    // Note: rejectUnauthorized: false is needed for ZIMRA test servers.
    rejectUnauthorized: false 
  });

  async function fdmsFetch<T>(
    path: string,
    init: RequestInit & { mtls?: boolean } = {},
  ): Promise<T> {
    const { mtls, headers, ...rest } = init;
    const url = buildUrl(path, deviceId);
    
    // console.log(`FDMS Request: ${init.method || 'GET'} ${url}`);

    const response = await fetch(url, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        // These MUST match your ZIMRA portal registration exactly
        "DeviceModelName": "Server", 
        "DeviceModelVersionNo": "v1",
        ...(headers ?? {}),
      },
      // @ts-expect-error Node.js fetch agent support
      agent: mtls ? mtlsAgent : undefined,
    });

    if (!response.ok) {
      let problem: FdmsProblemDetails | undefined;
      try {
        problem = (await response.json()) as FdmsProblemDetails;
      } catch {
        // ignore parsing issues
      }
      const message = problem?.title || problem?.detail || response.statusText;
      const errorCode = problem?.errorCode ? ` (${problem.errorCode})` : "";
      throw new Error(`FDMS error ${response.status}: ${message}${errorCode}`);
    }

    return (await response.json()) as T;
  }

  return {
    verifyTaxpayerInformation: <T>(body: unknown) =>
      fdmsFetch<T>(fdmsRoutes.verifyTaxpayerInformation, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    registerDevice: <T>(body: unknown) =>
      fdmsFetch<T>(fdmsRoutes.registerDevice, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    issueCertificate: <T>(body: unknown) =>
      fdmsFetch<T>(fdmsRoutes.issueCertificate, {
        method: "POST",
        body: JSON.stringify(body),
        mtls: true,
      }),
    getConfig: <T>(body: unknown) =>
      fdmsFetch<T>(fdmsRoutes.getConfig, {
        method: "POST",
        body: JSON.stringify(body),
        mtls: true,
      }),
    getStatus: <T>(body: unknown) =>
      fdmsFetch<T>(fdmsRoutes.getStatus, {
        method: "POST",
        body: JSON.stringify(body),
        mtls: true,
      }),
    openDay: <T>(body: unknown) =>
      fdmsFetch<T>(fdmsRoutes.openDay, {
        method: "POST",
        body: JSON.stringify(body),
        mtls: true,
      }),
    submitReceipt: <T>(body: unknown) =>
      fdmsFetch<T>(fdmsRoutes.submitReceipt, {
        method: "POST",
        body: JSON.stringify(body),
        mtls: true,
      }),
    submitFile: <T>(body: unknown) =>
      fdmsFetch<T>(fdmsRoutes.submitFile, {
        method: "POST",
        body: JSON.stringify(body),
        mtls: true,
      }),
    getFileStatus: <T>(body: unknown) =>
      fdmsFetch<T>(fdmsRoutes.getFileStatus, {
        method: "POST",
        body: JSON.stringify(body),
        mtls: true,
      }),
    closeDay: <T>(body: unknown) =>
      fdmsFetch<T>(fdmsRoutes.closeDay, {
        method: "POST",
        body: JSON.stringify(body),
        mtls: true,
      }),
    getServerCertificate: <T>() =>
      fdmsFetch<T>(fdmsRoutes.getServerCertificate, {
        method: "POST",
      }),
    ping: <T>() =>
      fdmsFetch<T>(fdmsRoutes.ping, {
        method: "POST",
        mtls: true,
      }),
  };
}
