import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { submitFile } from "@/lib/fdms/services";
import { requireDeviceForOrg } from "@/lib/auth/guards";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const deviceId = formData.get("deviceId");
    const fileType = formData.get("fileType");
    const file = formData.get("file");

    if (!deviceId || !fileType || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing deviceId, fileType, or file" },
        { status: 400 },
      );
    }

    const { device } = await requireDeviceForOrg(deviceId.toString());
    const rawContent = await file.text();

    let payload: unknown = null;
    try {
      payload = JSON.parse(rawContent);
    } catch {
      payload = { raw: rawContent };
    }

    const response = await submitFile(
      device.id,
      fileType.toString(),
      rawContent,
    );

    const [stored] = await db
      .insert(files)
      .values({
        deviceId: device.id,
        type: fileType.toString(),
        status: "submitted",
        fileName: file.name,
        payload,
        fdmsOperationId: response.operationID,
        uploadedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ success: true, file: stored });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to upload file";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
