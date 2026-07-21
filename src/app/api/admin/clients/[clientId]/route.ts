import { NextRequest } from "next/server";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/tenant";
import { apiSuccess, apiError, apiNoContent } from "@/lib/api-response";

// GET /admin/clients/[clientId]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    await requireAdmin();
    const { clientId } = await params;

    const client = await db.query.clients.findFirst({
      where: eq(clients.id, clientId),
    });

    if (!client) {
      return apiError({ statusCode: 404, message: "Client not found" });
    }

    return apiSuccess(client);
  } catch (error) {
    return apiError(error);
  }
}

// PUT /admin/clients/[clientId]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const ctx = await requireAdmin();
    const { clientId } = await params;
    const body = await req.json();

    const existing = await db.query.clients.findFirst({
      where: eq(clients.id, clientId),
    });

    if (!existing) {
      return apiError({ statusCode: 404, message: "Client not found" });
    }

    const [updated] = await db
      .update(clients)
      .set({
        ...body,
        lastModifiedBy: ctx.userId,
      })
      .where(eq(clients.id, clientId))
      .returning();

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}

// PATCH /admin/clients/[clientId] - Soft delete
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const ctx = await requireAdmin();
    const { clientId } = await params;
    const body = await req.json();

    if (body.action === "restore") {
      const [restored] = await db
        .update(clients)
        .set({ deleted: false, lastModifiedBy: ctx.userId })
        .where(eq(clients.id, clientId))
        .returning();
      return apiSuccess(restored);
    }

    const [deleted] = await db
      .update(clients)
      .set({ deleted: true, lastModifiedBy: ctx.userId })
      .where(eq(clients.id, clientId))
      .returning();

    return apiSuccess(deleted);
  } catch (error) {
    return apiError(error);
  }
}

// DELETE /admin/clients/[clientId] - Hard delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    await requireAdmin();
    const { clientId } = await params;

    await db.delete(clients).where(eq(clients.id, clientId));

    return apiNoContent();
  } catch (error) {
    return apiError(error);
  }
}
