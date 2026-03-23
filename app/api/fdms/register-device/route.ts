import { NextResponse } from "next/server";
import { z } from "zod";
import { createFdmsClient } from "@/lib/fdms/client";
import type { RegisterDeviceResponse } from "@/lib/fdms/types";

export const runtime = "nodejs";

const schema = z.object({
  deviceID: z.number().int(),
  activationKey: z.string().min(1).max(32),
  certificateRequest: z.string().min(1),
});

export async function POST(request: Request) {
  const payload = schema.parse(await request.json());
  const client = createFdmsClient("", "", payload.deviceID.toString());
  const data = await client.registerDevice<RegisterDeviceResponse>(payload);
  return NextResponse.json(data);
}
