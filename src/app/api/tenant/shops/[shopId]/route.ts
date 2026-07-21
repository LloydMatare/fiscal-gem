import { NextRequest } from "next/server";
import { db } from "@/db";
import { shops } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireTenant } from "@/lib/tenant";
import { apiSuccess, apiError } from "@/lib/api-response";

// GET /tenant/shops/[shopId]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const ctx = await requireTenant();
    const { shopId } = await params;

    const shop = await db.query.shops.findFirst({
      where: and(
        eq(shops.id, shopId),
        eq(shops.clientId, ctx.clientId!),
        eq(shops.deleted, false)
      ),
    });

    if (!shop) {
      return apiError({ statusCode: 404, message: "Shop not found" });
    }

    return apiSuccess(shop);
  } catch (error) {
    return apiError(error);
  }
}

// PUT /tenant/shops/[shopId]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const ctx = await requireTenant();
    const { shopId } = await params;
    const body = await req.json();

    const [updated] = await db
      .update(shops)
      .set({ ...body, lastModifiedBy: ctx.userId })
      .where(
        and(eq(shops.id, shopId), eq(shops.clientId, ctx.clientId!))
      )
      .returning();

    if (!updated) {
      return apiError({ statusCode: 404, message: "Shop not found" });
    }

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}
