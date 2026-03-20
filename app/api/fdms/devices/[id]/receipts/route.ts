import { NextRequest, NextResponse } from "next/server";
import { submitReceipt } from "@/lib/fdms/services";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deviceId = params.id;
    const receiptData = await request.json();
    const receipt = await submitReceipt(deviceId, receiptData);
    return NextResponse.json(receipt);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to submit receipt" }, { status: 500 });
  }
}