import { fdmsRequest } from "./client";
import { FDMS_PATHS } from "./config";

export interface GetServerCertificateResponse {
  Certificate?: string;
  Thumbprint?: string;
  Expiry?: string;
}

export interface VerifyTaxpayerInformationRequest {
  TIN?: string;
  DeviceID?: number;
  SerialNumber?: string;
}

export interface VerifyTaxpayerInformationResponse {
  Status?: string;
  Message?: string;
  TIN?: string;
  TaxpayerName?: string;
}

export async function getServerCertificate(
  thumbprint: string
): Promise<GetServerCertificateResponse> {
  return fdmsRequest<GetServerCertificateResponse>({
    method: "GET",
    path: FDMS_PATHS.GET_SERVER_CERTIFICATE,
    deviceId: 0,
    deviceModelName: "",
    deviceModelVersion: "",
    queryParams: { thumbprint },
  });
}

export async function verifyTaxpayerInformation(
  deviceId: number,
  request: VerifyTaxpayerInformationRequest
): Promise<VerifyTaxpayerInformationResponse> {
  return fdmsRequest<VerifyTaxpayerInformationResponse>({
    method: "POST",
    path: FDMS_PATHS.VERIFY_TAXPAYER,
    deviceId,
    deviceModelName: "",
    deviceModelVersion: "",
    body: request,
  });
}
