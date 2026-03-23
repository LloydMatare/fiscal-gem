import { NextResponse } from "next/server";
import { z } from "zod";
import { createFdmsClient } from "@/lib/fdms/client";
import type { VerifyTaxpayerResponse } from "@/lib/fdms/types";

export const runtime = "nodejs";

const schema = z.object({
  deviceID: z.number().int(),
  activationKey: z.string().min(1).max(32),
  deviceSerialNo: z.string().min(1).max(64),
});

export async function POST(request: Request) {
  const payload = schema.parse(await request.json());
  const client = createFdmsClient("", "", payload.deviceID.toString());
  const data = await client.verifyTaxpayerInformation<VerifyTaxpayerResponse>(
    payload,
  );
  return NextResponse.json(data);
}
