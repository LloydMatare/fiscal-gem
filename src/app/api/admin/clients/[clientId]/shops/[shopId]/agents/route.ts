import { NextRequest } from "next/server";
import { db } from "@/db";
import { agents } from "@/db/schema";
import { eq, desc, count, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/tenant";
import { apiSuccess, apiCreated, apiError, getSearchParams } from "@/lib/api-response";
import crypto from "crypto";

// GET /admin/clients/[clientId]/shops/[shopId]/agents
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string; shopId: string }> }
) {
  try {
    await requireAdmin();
    const { shopId } = await params;
    const { page, limit, offset } = getSearchParams(req);

    const [{ total }] = await db
      .select({ total: count() })
      .from(agents)
      .where(eq(agents.shopId, shopId));

    const data = await db
      .select()
      .from(agents)
      .where(eq(agents.shopId, shopId))
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

// POST /admin/clients/[clientId]/shops/[shopId]/agents
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string; shopId: string }> }
) {
  try {
    const ctx = await requireAdmin();
    const { shopId } = await params;
    const body = await req.json();

    const {
      machineId,
      agentVersion,
      os,
      osVersion,
      deviceName,
      type,
      deviceId,
    } = body;

    // Generate unique agent number
    const agentNumber = generateAgentNumber();
    // Generate API key
    const apiKey = generateApiKey();
    const apiKeyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

    const [agent] = await db
      .insert(agents)
      .values({
        shopId,
        machineId,
        apiKeyHash,
        agentNumber,
        status: "ACTIVE",
        online: false,
        agentVersion,
        os,
        osVersion,
        deviceName,
        type: type || "POS",
        deviceId,
        createdBy: ctx.userId,
      })
      .returning();

    return apiCreated({
      ...agent,
      apiKey, // Return the raw API key (only shown once)
    });
  } catch (error) {
    return apiError(error);
  }
}

function generateAgentNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AGT${timestamp}${random}`;
}

function generateApiKey(): string {
  return `fedge_${crypto.randomBytes(32).toString("hex")}`;
}
