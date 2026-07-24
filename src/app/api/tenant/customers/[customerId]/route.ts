import { NextRequest } from "next/server";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireTenant } from "@/lib/tenant";
import { apiSuccess, apiError } from "@/lib/api-response";

// GET /tenant/customers/[customerId]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const ctx = await requireTenant();
    const { customerId } = await params;

    const customer = await db.query.customers.findFirst({
      where: and(
        eq(customers.id, customerId),
        eq(customers.clientId, ctx.clientId!),
        eq(customers.deleted, false)
      ),
    });

    if (!customer) {
      return apiError({ statusCode: 404, message: "Customer not found" });
    }

    return apiSuccess(customer);
  } catch (error) {
    return apiError(error);
  }
}

// PUT /tenant/customers/[customerId]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const ctx = await requireTenant();
    const { customerId } = await params;
    const body = await req.json();

    const [updated] = await db
      .update(customers)
      .set({ ...body, lastModifiedBy: ctx.userId })
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.clientId, ctx.clientId!)
        )
      )
      .returning();

    if (!updated) {
      return apiError({ statusCode: 404, message: "Customer not found" });
    }

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}

// DELETE /tenant/customers/[customerId] (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const ctx = await requireTenant();
    const { customerId } = await params;

    const [deleted] = await db
      .update(customers)
      .set({ deleted: true, lastModifiedBy: ctx.userId })
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.clientId, ctx.clientId!)
        )
      )
      .returning();

    if (!deleted) {
      return apiError({ statusCode: 404, message: "Customer not found" });
    }

    return apiSuccess({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
