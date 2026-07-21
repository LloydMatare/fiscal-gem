import { NextRequest } from "next/server";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireTenant, provisionUser } from "@/lib/tenant";
import { apiSuccess, apiError } from "@/lib/api-response";

// GET /tenant/client/me - Get current tenant's profile
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTenant();

    const client = await db.query.clients.findFirst({
      where: eq(clients.id, ctx.clientId!),
    });

    if (!client) {
      return apiError({ statusCode: 404, message: "Client not found" });
    }

    // Auto-provision user
    await provisionUser(ctx.userId, ctx.clientId!);

    return apiSuccess(client);
  } catch (error) {
    return apiError(error);
  }
}

// PATCH /tenant/client/me - Update current tenant's profile
export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireTenant();
    const body = await req.json();

    const [updated] = await db
      .update(clients)
      .set({ ...body, lastModifiedBy: ctx.userId })
      .where(eq(clients.id, ctx.clientId!))
      .returning();

    if (!updated) {
      return apiError({ statusCode: 404, message: "Client not found" });
    }

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}
