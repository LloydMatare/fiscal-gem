import { NextResponse } from "next/server";
import { fdmsClient } from "@/lib/fdms/client";
import type { GetServerCertificateResponse } from "@/lib/fdms/types";

export const runtime = "nodejs";

export async function POST() {
  const data = await fdmsClient.getServerCertificate<GetServerCertificateResponse>();
  return NextResponse.json(data);
}
