import { NextRequest, NextResponse } from "next/server";
import { getDeviceConfig } from "@/lib/fdms/services";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deviceId = params.id;
    const config = await getDeviceConfig(deviceId);
    return NextResponse.json(config);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to get config" }, { status: 500 });
  }
}