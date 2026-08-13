import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/tenant";
import { apiSuccess, apiError } from "@/lib/api-response";

// DELETE /admin/clients/[clientId]/customers/[customerId]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ clientId: string; customerId: string }> }
) {
  try {
    await requireAdmin();
    const { clientId, customerId } = await params;

    const updated = await db
      .update(customers)
      .set({ deleted: true, updatedAt: new Date() })
      .where(and(eq(customers.id, customerId), eq(customers.clientId, clientId)))
      .returning();

    if (updated.length === 0) {
      return apiError({ statusCode: 404, message: "Customer not found" });
    }

    return apiSuccess({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
