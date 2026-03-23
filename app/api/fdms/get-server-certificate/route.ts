import { NextResponse } from "next/server";
import { createFdmsClient } from "@/lib/fdms/client";
import type { GetServerCertificateResponse } from "@/lib/fdms/types";
import { requireAdmin } from "@/lib/auth/guards";

export const runtime = "nodejs";

export async function POST() {
  try {
    await requireAdmin();
    const client = createFdmsClient("", "", "");
    const data = await client.getServerCertificate<GetServerCertificateResponse>();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get server certificate";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
