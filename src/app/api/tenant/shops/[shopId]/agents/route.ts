import { NextRequest } from "next/server";
import { db } from "@/db";
import { agents } from "@/db/schema";
import { eq, desc, count, and } from "drizzle-orm";
import { requireTenant } from "@/lib/tenant";
import { apiSuccess, apiError, getSearchParams } from "@/lib/api-response";

// GET /tenant/shops/[shopId]/agents
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const ctx = await requireTenant();
    const { shopId } = await params;
    const { page, limit, offset } = getSearchParams(req);

    const [{ total }] = await db
      .select({ total: count() })
      .from(agents)
      .where(and(eq(agents.shopId, shopId), eq(agents.deleted, false)));

    const data = await db
      .select()
      .from(agents)
      .where(and(eq(agents.shopId, shopId), eq(agents.deleted, false)))
      .orderBy(desc(agents.createdAt))
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

// GET /tenant/shops/[shopId]/agents/[agentId]
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    // Tenant agents are read-only; creation is admin-only
    return apiError({ statusCode: 405, message: "Use admin endpoint to create agents" });
  } catch (error) {
    return apiError(error);
  }
}
