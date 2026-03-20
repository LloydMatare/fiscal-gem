import { NextRequest, NextResponse } from "next/server";
import { closeFiscalDay } from "@/lib/fdms/services";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deviceId = params.id;
    const fiscalDay = await closeFiscalDay(deviceId);
    return NextResponse.json(fiscalDay);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to close fiscal day" }, { status: 500 });
  }
}