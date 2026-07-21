import { NextRequest } from "next/server";
import { db } from "@/db";
import { agents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/api-response";

// PATCH /s2s/agent - Agent heartbeat / activate
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, action, online, lastIpAddress, agentVersion } = body;

    if (!agentId) {
      return apiError({ statusCode: 400, message: "agentId is required" });
    }

    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, agentId),
    });

    if (!agent) {
      return apiError({ statusCode: 404, message: "Agent not found" });
    }

    const updateData: Record<string, any> = {
      lastSeen: new Date(),
      lastIpAddress: lastIpAddress || agent.lastIpAddress,
    };

    if (action === "activate") {
      updateData.status = "ACTIVE";
      updateData.online = true;
      if (agentVersion) updateData.agentVersion = agentVersion;
    } else if (action === "heartbeat") {
      updateData.online = online !== false;
      if (agentVersion) updateData.agentVersion = agentVersion;
    }

    const [updated] = await db
      .update(agents)
      .set(updateData)
      .where(eq(agents.id, agentId))
      .returning();

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}

// GET /s2s/agent - Get agent configuration
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");

    if (!agentId) {
      return apiError({ statusCode: 400, message: "agentId query parameter is required" });
    }

    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, agentId),
    });

    if (!agent) {
      return apiError({ statusCode: 404, message: "Agent not found" });
    }

    // Return agent configuration (shop settings, device info, etc.)
    return apiSuccess({
      agentId: agent.id,
      status: agent.status,
      agentVersion: agent.agentVersion,
      os: agent.os,
      deviceName: agent.deviceName,
    });
  } catch (error) {
    return apiError(error);
  }
}
