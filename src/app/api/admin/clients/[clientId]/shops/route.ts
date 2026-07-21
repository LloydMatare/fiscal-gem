import { NextRequest } from "next/server";
import { db } from "@/db";
import { shops } from "@/db/schema";
import { eq, desc, count, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/tenant";
import { apiSuccess, apiCreated, apiError, getSearchParams } from "@/lib/api-response";

// GET /admin/clients/[clientId]/shops
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    await requireAdmin();
    const { clientId } = await params;
    const { page, limit, offset } = getSearchParams(req);

    const [{ total }] = await db
      .select({ total: count() })
      .from(shops)
      .where(eq(shops.clientId, clientId));

    const data = await db
      .select()
      .from(shops)
      .where(eq(shops.clientId, clientId))
      .orderBy(desc(shops.createdAt))
      .limit(limit)
      .offset(offset);

    return apiSuccess({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return apiError(error);
  }
}

// POST /admin/clients/[clientId]/shops
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const ctx = await requireAdmin();
    const { clientId } = await params;
    const body = await req.json();

    const { name, city, address, contactPerson, contactPhone } = body;

    if (!name) {
      return apiError({ statusCode: 400, message: "Shop name is required" });
    }

    const [shop] = await db
      .insert(shops)
      .values({
        name,
        city,
        address,
        contactPerson,
        contactPhone,
        clientId,
        createdBy: ctx.userId,
      })
      .returning();

    return apiCreated(shop);
  } catch (error) {
    return apiError(error);
  }
}
