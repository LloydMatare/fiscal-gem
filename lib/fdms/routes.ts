export const fdmsRoutes = {
  verifyTaxpayerInformation: "/Public/v1/VerifyTaxpayerInformation",
  registerDevice: "/Public/v1/RegisterDevice",
  getServerCertificate: "/Public/v1/GetServerCertificate",
  
  issueCertificate: "/Device/v1/IssueCertificate",
  getConfig: "/Device/v1/GetConfig",
  getStatus: "/Device/v1/GetStatus",
  openDay: "/Device/v1/OpenDay",
  submitReceipt: "/Device/v1/SubmitReceipt",
  submitFile: "/Device/v1/SubmitFile",
  getFileStatus: "/Device/v1/GetFileStatus",
  closeDay: "/Device/v1/CloseDay",
  ping: "/Device/v1/Ping",
} as const;
