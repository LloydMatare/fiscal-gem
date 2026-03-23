import { NextRequest, NextResponse } from "next/server";
import { processPendingReceipts } from "@/lib/fdms/services";
import { requireAdmin } from "@/lib/auth/guards";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    await processPendingReceipts();
    return NextResponse.json({ message: "Processed pending receipts" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process pending receipts";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
