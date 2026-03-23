import { NextRequest, NextResponse } from "next/server";
import { getDeviceConfig } from "@/lib/fdms/services";
import { requireDeviceForOrg } from "@/lib/auth/guards";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deviceId } = await params;
    await requireDeviceForOrg(deviceId);
    const config = await getDeviceConfig(deviceId);
    return NextResponse.json(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get config";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
