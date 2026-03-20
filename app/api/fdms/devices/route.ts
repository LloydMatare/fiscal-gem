import { NextRequest, NextResponse } from "next/server";
import { registerDevice } from "@/lib/fdms/services";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Assume organization from user, but for simplicity, use a default or from body
    const body = await request.json();
    const { organizationId, deviceId, serialNumber, activationKey, branchName, branchAddress, branchContacts } = body;

    const device = await registerDevice(organizationId, {
      deviceId,
      serialNumber,
      activationKey,
      branchName,
      branchAddress,
      branchContacts,
    });

    return NextResponse.json(device);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to register device" }, { status: 500 });
  }
}