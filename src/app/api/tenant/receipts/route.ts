import { NextRequest } from "next/server";
import { db } from "@/db";
import { receipts } from "@/db/schema";
import { eq, desc, count, and } from "drizzle-orm";
import { requireTenant } from "@/lib/tenant";
import { apiSuccess, apiError, getSearchParams } from "@/lib/api-response";

// GET /tenant/receipts
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    const { page, limit, offset, status } = getSearchParams(req);

    const conditions = [
      eq(receipts.clientId, ctx.clientId!),
    ];
    if (status) {
      conditions.push(eq(receipts.status, status as any));
    }

    const whereClause = and(...conditions);

    const [{ total }] = await db
      .select({ total: count() })
      .from(receipts)
      .where(whereClause);

    const data = await db
      .select()
      .from(receipts)
      .where(whereClause)
      .orderBy(desc(receipts.receivedAt))
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
