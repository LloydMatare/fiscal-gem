import { NextRequest, NextResponse } from "next/server";
import { closeFiscalDay } from "@/lib/fdms/services";
import { requireDeviceForOrg } from "@/lib/auth/guards";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deviceId } = await params;
    await requireDeviceForOrg(deviceId);
    const fiscalDay = await closeFiscalDay(deviceId);
    return NextResponse.json(fiscalDay);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to close fiscal day";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
