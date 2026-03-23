import { NextRequest, NextResponse } from "next/server";
import { submitReceipt } from "@/lib/fdms/services";
import { requireDeviceForOrg } from "@/lib/auth/guards";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deviceId } = await params;
    await requireDeviceForOrg(deviceId);
    const receiptData = await request.json();
    const receipt = await submitReceipt(deviceId, receiptData);
    return NextResponse.json(receipt);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit receipt";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
