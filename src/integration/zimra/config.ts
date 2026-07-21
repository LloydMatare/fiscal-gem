export const FDMS_BASE_URL =
  process.env.FDMS_BASE_URL || "https://fdmsapitest.zimra.co.zw";

export const FDMS_PATHS = {
  REGISTER_DEVICE: "/Public/v1/{deviceID}/RegisterDevice",
  GET_CONFIG: "/Device/v1/{deviceID}/GetConfig",
  GET_STATUS: "/Device/v1/{deviceID}/GetStatus",
  ISSUE_CERTIFICATE: "/Device/v1/{deviceID}/IssueCertificate",
  OPEN_DAY: "/Device/v1/{deviceID}/OpenDay",
  CLOSE_DAY: "/Device/v1/{deviceID}/CloseDay",
  PING: "/Device/v1/{deviceID}/Ping",
  SUBMIT_RECEIPT: "/Device/v1/{deviceID}/SubmitReceipt",
  SUBMIT_FILE: "/Device/v1/{deviceID}/SubmitFile",
  SUBMITTED_FILE_LIST: "/Device/v1/{deviceID}/SubmittedFileList",
  GET_SERVER_CERTIFICATE: "/Public/v1/GetServerCertificate",
  VERIFY_TAXPAYER: "/Public/v1/{deviceID}/VerifyTaxpayerInformation",
} as const;
