export type FdmsEnvironment = "test" | "prod";

export interface FdmsProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  [key: string]: unknown;
}

export interface VerifyTaxpayerRequest {
  deviceID: number;
  activationKey: string;
  deviceSerialNo: string;
}

export interface VerifyTaxpayerResponse {
  operationID: string;
  taxPayerName: string;
  taxPayerTIN: string;
  vatNumber?: string;
  deviceBranchName: string;
  deviceBranchAddress: Record<string, unknown>;
  deviceBranchContacts?: Record<string, unknown>;
}

export interface RegisterDeviceRequest {
  deviceID: number;
  activationKey: string;
  certificateRequest: string;
}

export interface RegisterDeviceResponse {
  operationID: string;
  certificate: string;
}

export interface IssueCertificateRequest {
  deviceID: number;
  certificateRequest: string;
}

export interface IssueCertificateResponse {
  operationID: string;
  certificate: string;
}

export interface GetServerCertificateResponse {
  certificate: string;
}

export interface GetConfigResponse {
  operationID: string;
  taxRates: any;
  taxPayerDetails: any;
}

export interface OpenDayResponse {
  operationID: string;
  fdmsDayNo?: number;
}

export interface CloseDayResponse {
  operationID: string;
}

export interface SubmitReceiptResponse {
  operationID: string;
  receiptQrCodeUrl?: string;
}

export interface SubmitFileResponse {
  operationID: string;
}

export interface GetFileStatusResponse {
  operationID: string;
  status?: string;
  details?: string;
}
