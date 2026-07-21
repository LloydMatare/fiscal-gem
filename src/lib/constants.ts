export const STATUS_COLORS = {
  ACTIVE: "emerald",
  INACTIVE: "gray",
  SUSPENDED: "amber",
  DELETED: "red",
} as const;

export const RECEIPT_STATUS_COLORS = {
  RECEIVED: "blue",
  SIGNED: "indigo",
  SENT: "purple",
  ACCEPTED: "emerald",
  FISCALISED: "emerald",
  FAILED: "red",
} as const;

export const CURRENCIES = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "ZWL", label: "ZWL - Zimbabwean Dollar" },
  { value: "ZAR", label: "ZAR - South African Rand" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "EUR", label: "EUR - Euro" },
] as const;

export const TIMEZONES = [
  { value: "Africa/Harare", label: "Africa/Harare (CAT, UTC+2)" },
  { value: "Africa/Johannesburg", label: "Africa/Johannesburg (SAST, UTC+2)" },
  { value: "Europe/London", label: "Europe/London (GMT, UTC+0)" },
  { value: "America/New_York", label: "America/New_York (EST, UTC-5)" },
] as const;
