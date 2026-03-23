import { NextResponse } from "next/server";
import { createFdmsClient } from "@/lib/fdms/client";
import type { GetServerCertificateResponse } from "@/lib/fdms/types";

export const runtime = "nodejs";

export async function POST() {
  const client = createFdmsClient("", "", "");
  const data = await client.getServerCertificate<GetServerCertificateResponse>();
  return NextResponse.json(data);
}
