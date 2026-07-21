import { NextRequest } from "next/server";
import { db } from "@/db";
import { shops } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/tenant";
import { apiSuccess, apiError, apiNoContent } from "@/lib/api-response";

// GET /admin/clients/[clientId]/shops/[shopId]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string; shopId: string }> }
) {
  try {
    await requireAdmin();
    const { clientId, shopId } = await params;

    const shop = await db.query.shops.findFirst({
      where: and(eq(shops.id, shopId), eq(shops.clientId, clientId)),
    });

    if (!shop) {
      return apiError({ statusCode: 404, message: "Shop not found" });
    }

    return apiSuccess(shop);
  } catch (error) {
    return apiError(error);
  }
}

// PUT /admin/clients/[clientId]/shops/[shopId]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string; shopId: string }> }
) {
  try {
    const ctx = await requireAdmin();
    const { clientId, shopId } = await params;
    const body = await req.json();

    const [updated] = await db
      .update(shops)
      .set({ ...body, lastModifiedBy: ctx.userId })
      .where(and(eq(shops.id, shopId), eq(shops.clientId, clientId)))
      .returning();

    if (!updated) {
      return apiError({ statusCode: 404, message: "Shop not found" });
    }

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}

// PATCH /admin/clients/[clientId]/shops/[shopId] - Soft delete / restore
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string; shopId: string }> }
) {
  try {
    const ctx = await requireAdmin();
    const { clientId, shopId } = await params;
    const body = await req.json();

    const action = body.action === "restore" ? false : true;
    const [result] = await db
      .update(shops)
      .set({ deleted: action, lastModifiedBy: ctx.userId })
      .where(and(eq(shops.id, shopId), eq(shops.clientId, clientId)))
      .returning();

    if (!result) {
      return apiError({ statusCode: 404, message: "Shop not found" });
    }

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}

// DELETE /admin/clients/[clientId]/shops/[shopId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string; shopId: string }> }
) {
  try {
    await requireAdmin();
    const { clientId, shopId } = await params;

    await db
      .delete(shops)
      .where(and(eq(shops.id, shopId), eq(shops.clientId, clientId)));

    return apiNoContent();
  } catch (error) {
    return apiError(error);
  }
}
