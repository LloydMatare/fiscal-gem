import { fdmsRequest, type FdmsApiException } from "./client";
import { FDMS_PATHS } from "./config";

export interface RegisterDeviceRequest {
  DeviceModelName: string;
  DeviceModelVersion: string;
  SerialNumber: string;
  CommonName: string;
  PublicKey: string;
}

export interface DeviceConfigResponse {
  DeviceOperatingMode?: string;
  FirmwareVersion?: string;
  TimeStamp?: string;
}

export interface GetStatusResponse {
  DeviceOperatingMode?: string;
  FiscalDayStatus?: string;
  FiscalDayNo?: number;
  TimeStamp?: string;
}

export interface CertificateResponse {
  Certificate?: string;
  TimeStamp?: string;
}

export interface OpenDayRequest {
  ReceiptNo: number;
  OpenDate: string;
  OpenTime: string;
  OperatorId?: string;
  ReconciliationMode?: string;
}

export interface OpenDayResponse {
  OperationId?: string;
  DeviceId?: number;
  ReceiptNo?: number;
  TimeStamp?: string;
}

export interface CloseDayRequest {
  ReceiptNo: number;
  CloseDate: string;
  CloseTime: string;
  OperatorId?: string;
  ReconciliationMode?: string;
}

export interface CloseDayResponse {
  OperationId?: string;
  DeviceId?: number;
  ReceiptNo?: number;
  TimeStamp?: string;
  CloseFiscalDaySignature?: string;
  CloseFiscalDaySignatureHash?: string;
}

export interface PingResponse {
  DeviceId?: number;
  Status?: string;
  TimeStamp?: string;
}

export interface SubmitFileResponse {
  OperationId?: string;
  DeviceId?: number;
  TimeStamp?: string;
}

export interface SubmittedFileHeaderDto {
  OperationId?: string;
  FileName?: string;
  FileUploadedAt?: string;
  FileUploadedFrom?: string;
  Status?: string;
}

export interface SubmittedFileHeaderDtoListResponse {
  SubmittedFileHeaders?: SubmittedFileHeaderDto[];
  TotalCount?: number;
}

export interface DevicesGetSubmittedFileListRequest {
  OperationID?: string;
  FileUploadedFrom: string;
  FileUploadedTill: string;
  Sort?: string;
  Order?: string;
  Offset: number;
  Limit: number;
  Operator?: string;
}

// --- Service Functions ---

export async function registerDevice(
  deviceId: number,
  deviceModelName: string,
  deviceModelVersion: string,
  certificateRequest: RegisterDeviceRequest
): Promise<string> {
  const result = await fdmsRequest<string>({
    method: "POST",
    path: FDMS_PATHS.REGISTER_DEVICE,
    deviceId,
    deviceModelName,
    deviceModelVersion,
    body: certificateRequest,
  });
  return result;
}

export async function getDeviceConfig(
  deviceId: number,
  deviceModelName: string,
  deviceModelVersion: string,
  certificatePem: string,
  privateKeyPem: string
): Promise<DeviceConfigResponse> {
  return fdmsRequest<DeviceConfigResponse>({
    method: "GET",
    path: FDMS_PATHS.GET_CONFIG,
    deviceId,
    deviceModelName,
    deviceModelVersion,
    certificatePem,
    privateKeyPem,
  });
}

export async function getDeviceStatus(
  deviceId: number,
  deviceModelName: string,
  deviceModelVersion: string,
  certificatePem: string,
  privateKeyPem: string
): Promise<GetStatusResponse> {
  return fdmsRequest<GetStatusResponse>({
    method: "GET",
    path: FDMS_PATHS.GET_STATUS,
    deviceId,
    deviceModelName,
    deviceModelVersion,
    certificatePem,
    privateKeyPem,
  });
}

export async function issueCertificate(
  deviceId: number,
  deviceModelName: string,
  deviceModelVersion: string,
  certificatePem: string,
  privateKeyPem: string,
  certificateRequest: RegisterDeviceRequest
): Promise<CertificateResponse> {
  return fdmsRequest<CertificateResponse>({
    method: "POST",
    path: FDMS_PATHS.ISSUE_CERTIFICATE,
    deviceId,
    deviceModelName,
    deviceModelVersion,
    certificatePem,
    privateKeyPem,
    body: certificateRequest,
  });
}

export async function openDay(
  deviceId: number,
  deviceModelName: string,
  deviceModelVersion: string,
  certificatePem: string,
  privateKeyPem: string,
  request: OpenDayRequest
): Promise<OpenDayResponse> {
  return fdmsRequest<OpenDayResponse>({
    method: "POST",
    path: FDMS_PATHS.OPEN_DAY,
    deviceId,
    deviceModelName,
    deviceModelVersion,
    certificatePem,
    privateKeyPem,
    body: request,
  });
}

export async function closeDay(
  deviceId: number,
  deviceModelName: string,
  deviceModelVersion: string,
  certificatePem: string,
  privateKeyPem: string,
  request: CloseDayRequest
): Promise<CloseDayResponse> {
  return fdmsRequest<CloseDayResponse>({
    method: "POST",
    path: FDMS_PATHS.CLOSE_DAY,
    deviceId,
    deviceModelName,
    deviceModelVersion,
    certificatePem,
    privateKeyPem,
    body: request,
  });
}

export async function pingDevice(
  deviceId: number,
  deviceModelName: string,
  deviceModelVersion: string,
  certificatePem: string,
  privateKeyPem: string
): Promise<PingResponse> {
  return fdmsRequest<PingResponse>({
    method: "POST",
    path: FDMS_PATHS.PING,
    deviceId,
    deviceModelName,
    deviceModelVersion,
    certificatePem,
    privateKeyPem,
  });
}

export async function submitFile(
  deviceId: number,
  deviceModelName: string,
  deviceModelVersion: string,
  certificatePem: string,
  privateKeyPem: string,
  base64FileContent: string,
  filename?: string
): Promise<SubmitFileResponse> {
  const formData = new FormData();
  formData.append("deviceID", String(deviceId));
  formData.append(
    "file",
    new Blob([base64FileContent], { type: "application/octet-stream" }),
    filename ?? `submit-file-${deviceId}.json.b64`
  );

  return fdmsRequest<SubmitFileResponse>({
    method: "POST",
    path: FDMS_PATHS.SUBMIT_FILE,
    deviceId,
    deviceModelName,
    deviceModelVersion,
    certificatePem,
    privateKeyPem,
    body: formData,
    contentType: "multipart/form-data",
  });
}

export async function submittedFileList(
  deviceId: number,
  deviceModelName: string,
  deviceModelVersion: string,
  certificatePem: string,
  privateKeyPem: string,
  request: DevicesGetSubmittedFileListRequest
): Promise<SubmittedFileHeaderDtoListResponse> {
  const queryParams: Record<string, string> = {
    FileUploadedFrom: request.FileUploadedFrom,
    FileUploadedTill: request.FileUploadedTill,
    Offset: String(request.Offset),
    Limit: String(request.Limit),
  };
  if (request.OperationID) queryParams.OperationID = request.OperationID;
  if (request.Sort) queryParams.Sort = request.Sort;
  if (request.Order) queryParams.Order = request.Order;
  if (request.Operator) queryParams.Operator = request.Operator;

  return fdmsRequest<SubmittedFileHeaderDtoListResponse>({
    method: "GET",
    path: FDMS_PATHS.SUBMITTED_FILE_LIST,
    deviceId,
    deviceModelName,
    deviceModelVersion,
    certificatePem,
    privateKeyPem,
    queryParams,
  });
}
