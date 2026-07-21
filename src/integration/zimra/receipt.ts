import { fdmsRequest } from "./client";
import { FDMS_PATHS } from "./config";

export interface SubmitReceiptRequest {
  receipt: {
    receiptGlobalNo: number;
    receiptCounter: number;
    receiptType: string;
    invoiceNo: string;
    externalReference: string;
    receiptDate: string;
    receiptTime: string;
    operatorId?: string;
    fiscalDayNo?: number;
    previousReceiptHash?: string;
    lines: ReceiptLineDto[];
    payments: ReceiptPaymentDto[];
    taxes: ReceiptTaxDto[];
    buyer?: BuyerDto;
    signatureData?: SignatureDataDto;
  };
}

export interface ReceiptLineDto {
  lineNo: number;
  articleName: string;
  articleCode?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate?: number;
  taxAmount?: number;
}

export interface ReceiptPaymentDto {
  paymentType: string;
  paymentAmount: number;
  paymentDate?: string;
  paymentTime?: string;
  paymentReference?: string;
}

export interface ReceiptTaxDto {
  taxCode: string;
  taxRate: number;
  taxAmount: number;
  taxType?: string;
}

export interface BuyerDto {
  name?: string;
  tin?: string;
  address?: string;
  contact?: string;
}

export interface SignatureDataDto {
  signedData?: string;
  signature?: string;
}

export interface SubmitReceiptResponse {
  OperationId?: string;
  DeviceId?: number;
  ReceiptId?: number;
  ReceiptGlobalNo?: number;
  ReceiptServerDate?: string;
  ReceiptServerTime?: string;
  Signature?: string;
  SignatureHash?: string;
  SignatureThumbprint?: string;
  TimeStamp?: string;
}

export async function submitReceipt(
  deviceId: number,
  deviceModelName: string,
  deviceModelVersion: string,
  certificatePem: string,
  privateKeyPem: string,
  request: SubmitReceiptRequest
): Promise<SubmitReceiptResponse> {
  return fdmsRequest<SubmitReceiptResponse>({
    method: "POST",
    path: FDMS_PATHS.SUBMIT_RECEIPT,
    deviceId,
    deviceModelName,
    deviceModelVersion,
    certificatePem,
    privateKeyPem,
    body: request,
  });
}
