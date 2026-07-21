import { NextRequest } from "next/server";
import { getServerCertificate, verifyTaxpayerInformation } from "@/integration/zimra/public-api";
import { apiSuccess, apiError } from "@/lib/api-response";

// GET /fdms/public/server-certificate
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const thumbprint = searchParams.get("thumbprint");

    if (!thumbprint) {
      return apiError({
        statusCode: 400,
        message: "thumbprint query parameter is required",
      });
    }

    const result = await getServerCertificate(thumbprint);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}

// POST /fdms/public/verify-taxpayer
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { deviceId, ...request } = body;

    if (!deviceId) {
      return apiError({
        statusCode: 400,
        message: "deviceId is required",
      });
    }

    const result = await verifyTaxpayerInformation(deviceId, request);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
