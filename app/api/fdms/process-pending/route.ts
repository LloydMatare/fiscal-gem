import { NextRequest, NextResponse } from "next/server";
import { processPendingReceipts } from "@/lib/fdms/services";

export async function POST(request: NextRequest) {
  try {
    await processPendingReceipts();
    return NextResponse.json({ message: "Processed pending receipts" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to process pending receipts" }, { status: 500 });
  }
}