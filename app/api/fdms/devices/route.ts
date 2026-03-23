import { NextRequest, NextResponse } from "next/server";
import { registerDevice } from "@/lib/fdms/services";
import { requireOrganizationAdmin } from "@/lib/auth/guards";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, serialNumber, activationKey, branchName, branchAddress, branchContacts } = body;

    const { org } = await requireOrganizationAdmin();

    const device = await registerDevice(org.id, {
      deviceId,
      serialNumber,
      activationKey,
      branchName,
      branchAddress,
      branchContacts,
    });

    return NextResponse.json(device);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to register device";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
