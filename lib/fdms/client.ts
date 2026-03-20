import "server-only";
import https from "https";
import { fdmsRoutes } from "./routes";
import type { FdmsProblemDetails } from "./types";

const baseUrl = process.env.FDMS_BASE_URL ?? "";
const apiPrefix = process.env.FDMS_API_PATH_PREFIX ?? "/api/v7.2";

if (!baseUrl) {
  throw new Error("FDMS_BASE_URL is not set");
}


const buildUrl = (path: string) => `${baseUrl}${apiPrefix}${path}`;

export function createFdmsClient(deviceCert: string, deviceKey: string) {
  const mtlsAgent = new https.Agent({
    cert: deviceCert,
    key: deviceKey,
  });

  async function fdmsFetch<T>(
    path: string,
    init: RequestInit & { mtls?: boolean } = {},
  ): Promise<T> {
    const { mtls, headers, ...rest } = init;
    const response = await fetch(buildUrl(path), {
      ...rest,
      headers: {
        "Content-Type": "application/json",
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
      const message = problem?.title ?? problem?.detail ?? response.statusText;
      throw new Error(`FDMS error ${response.status}: ${message}`);
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

export const fdmsClient = createFdmsClient("", "");
