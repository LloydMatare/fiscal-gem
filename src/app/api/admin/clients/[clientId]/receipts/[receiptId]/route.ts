import { NextRequest } from "next/server";
import { db } from "@/db";
import { receipts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/tenant";
import { apiSuccess, apiError } from "@/lib/api-response";

// GET /admin/clients/[clientId]/receipts/[receiptId]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string; receiptId: string }> }
) {
  try {
    await requireAdmin();
    const { clientId, receiptId } = await params;

    const receipt = await db.query.receipts.findFirst({
      where: eq(receipts.id, receiptId),
    });

    if (!receipt || receipt.clientId !== clientId) {
      return apiError({ statusCode: 404, message: "Receipt not found" });
    }

    return apiSuccess(receipt);
  } catch (error) {
    return apiError(error);
  }
}

// DELETE /admin/clients/[clientId]/receipts/[receiptId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string; receiptId: string }> }
) {
  try {
    await requireAdmin();
    const { clientId, receiptId } = await params;

    const [deleted] = await db
      .delete(receipts)
      .where(and(eq(receipts.id, receiptId), eq(receipts.clientId, clientId)))
      .returning();

    if (!deleted) {
      return apiError({ statusCode: 404, message: "Receipt not found" });
    }

    return apiSuccess({ message: "Receipt deleted" });
  } catch (error) {
    return apiError(error);
  }
}
