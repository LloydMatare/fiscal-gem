import { NextResponse } from "next/server";
import { z } from "zod";
import { createFdmsClient } from "@/lib/fdms/client";
import type { RegisterDeviceResponse } from "@/lib/fdms/types";
import { requireAdmin } from "@/lib/auth/guards";

export const runtime = "nodejs";

const schema = z.object({
  deviceID: z.number().int(),
  activationKey: z.string().min(1).max(32),
  certificateRequest: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const payload = schema.parse(await request.json());
    const client = createFdmsClient("", "", payload.deviceID.toString());
    const data = await client.registerDevice<RegisterDeviceResponse>(payload);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to register device";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
