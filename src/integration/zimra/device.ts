import { fdmsRequest, type FdmsApiException } from "./client";
import { FDMS_PATHS } from "./config";

export interface RegisterDeviceRequest {
  ActivationKey: string;
  CertificateRequest: string;
}

export interface RegisterDeviceResponse {
  certificate: string;
  operationID: string;
}

export interface DeviceBranchAddress {
  province?: string;
  street?: string;
  houseNo?: string;
  city?: string;
}

export interface DeviceBranchContacts {
  phoneNo?: string;
  email?: string;
}

export interface ApplicableTax {
  taxID?: number;
  taxPercent?: number;
  taxName?: string;
  taxValidFrom?: string;
  taxValidTill?: string;
  exempt?: boolean;
  zeroRated?: boolean;
  vatRated?: boolean;
}

export interface DeviceConfigResponse {
  operationID?: string;
  taxPayerName?: string;
  taxPayerTIN?: string;
  vatNumber?: string;
  deviceSerialNo?: string;
  deviceBranchName?: string;
  deviceBranchAddress?: DeviceBranchAddress;
  deviceBranchContacts?: DeviceBranchContacts;
  deviceOperatingMode?: string;
  taxPayerDayMaxHrs?: number;
  applicableTaxes?: ApplicableTax[];
  certificateValidTill?: string;
  qrUrl?: string;
  taxpayerDayEndNotificationHrs?: number;
}

export interface FiscalDayServerSignature {
  hash?: string;
  signature?: string;
  certificateThumbprint?: string;
}

export interface FiscalCounterEntry {
  fiscalCounterType?: string;
  fiscalCounterCurrency?: string;
  fiscalCounterTaxPercent?: number;
  fiscalCounterTaxID?: number;
  fiscalCounterMoneyType?: string;
  fiscalCounterValue?: number;
}

export interface FiscalDayDocumentQuantity {
  receiptType?: string;
  receiptCurrency?: string;
  receiptQuantity?: number;
  receiptTotalAmount?: number;
}

export interface GetStatusResponse {
  operationID?: string;
  fiscalDayStatus?: string;
  fiscalDayReconciliationMode?: string;
  fiscalDayServerSignature?: FiscalDayServerSignature;
  fiscalDayDeviceSignature?: FiscalDayServerSignature;
  fiscalDayClosed?: string;
  fiscalDayCounter?: FiscalCounterEntry[];
  lastReceiptGlobalNo?: number;
  lastFiscalDayNo?: number;
  fiscalDayClosingErrorCode?: string;
  fiscalDayDocumentQuantities?: FiscalDayDocumentQuantity[];
}

export interface CertificateResponse {
  Certificate?: string;
  TimeStamp?: string;
}

export interface OpenDayRequest {
  receiptCounter: number;
  fiscalDayOpened: string;
  ReconciliationMode?: string;
}

export interface OpenDayResponse {
  OperationId?: string;
  DeviceId?: number;
  ReceiptNo?: number;
  TimeStamp?: string;
}

export interface CloseDayRequest {
  receiptCounter: number;
  fiscalDayNo: number;
  fiscalDayCounters: FiscalCounterEntry[];
  fiscalDayDeviceSignature: FiscalDayServerSignature;
  fiscalDayClosed: string;
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
  request: RegisterDeviceRequest
): Promise<RegisterDeviceResponse> {
  return fdmsRequest<RegisterDeviceResponse>({
    method: "POST",
    path: FDMS_PATHS.REGISTER_DEVICE,
    deviceId,
    deviceModelName,
    deviceModelVersion,
    body: request,
  });
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
  request: RegisterDeviceRequest
): Promise<CertificateResponse> {
  return fdmsRequest<CertificateResponse>({
    method: "POST",
    path: FDMS_PATHS.ISSUE_CERTIFICATE,
    deviceId,
    deviceModelName,
    deviceModelVersion,
    certificatePem,
    privateKeyPem,
    body: request,
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
