import { db } from "@/db";
import { devices, receipts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/tenant";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { DeviceActions } from "@/components/admin/device-actions";
import { DeviceStatusButton } from "@/components/admin/device-status-button";
import { DeviceConfigButton } from "@/components/admin/device-config-button";
import { DeviceStatusCard } from "@/components/admin/device-status-card";
import { SubmitReceiptButton } from "@/components/admin/submit-receipt-button";

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ clientId: string; deviceId: string }>;
}) {
  await requireAdminPage();
  const { clientId, deviceId } = await params;

  const device = await db.query.devices.findFirst({
    where: and(eq(devices.id, deviceId), eq(devices.clientId, clientId)),
  });

  if (!device) notFound();

  // Compute next invoice number from previous receipts for today's date
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const todayPrefix = `INV-${device.deviceId}-${todayStr}-`;

  const lastReceipt = await db.query.receipts.findFirst({
    where: and(
      eq(receipts.clientId, clientId),
      eq(receipts.deviceId, device.id)
    ),
    orderBy: [desc(receipts.invoiceNo)],
  });
  let nextInvoiceNo: string;
  const lastInvoice = lastReceipt?.invoiceNo || "";
  const match = lastInvoice.startsWith(todayPrefix)
    ? lastInvoice.match(/(\d+)$/)
    : null;
  const nextSeq = match ? Number(match[1]) + 1 : 1;
  nextInvoiceNo = `${todayPrefix}${String(nextSeq).padStart(4, "0")}`;

  return (
    <div>
      <PageHeader
        title={`Device ${device.deviceId || "—"}`}
        description={`Serial: ${device.serialNumber || "—"}`}
        breadcrumbs={[
          { label: "Clients", href: "/admin/clients" },
          { label: clientId, href: `/admin/clients/${clientId}` },
          { label: "Devices", href: `/admin/clients/${clientId}/devices` },
          { label: `Device ${device.deviceId}`, href: `#` },
        ]}
      >
        <div className="flex items-center gap-2">
          <Badge variant={device.activated ? "default" : "secondary"}>
            {device.activated ? "Activated" : "Not Activated"}
          </Badge>
          <DeviceStatusButton
            clientId={clientId}
            deviceId={device.deviceId!}
            deviceModelName={device.deviceModelName}
            deviceModelVersion={device.deviceModelVersion}
          />
          <DeviceConfigButton
            clientId={clientId}
            deviceId={device.deviceId!}
            deviceModelName={device.deviceModelName}
            deviceModelVersion={device.deviceModelVersion}
          />
          <SubmitReceiptButton
            clientId={clientId}
            deviceId={device.deviceId!}
            deviceModelName={device.deviceModelName}
            deviceModelVersion={device.deviceModelVersion}
            nextInvoiceNo={nextInvoiceNo}
          />
          <DeviceActions device={device as any} />
        </div>
      </PageHeader>
      <div className="my-6"/>

      <DeviceStatusCard
        clientId={clientId}
        deviceId={device.deviceId!}
        deviceModelName={device.deviceModelName}
        deviceModelVersion={device.deviceModelVersion}
      />

      <div className="my-6"/>

      <div className="rounded-md border p-6">
        <h2 className="text-lg font-semibold mb-4">Device Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <InfoRow label="Device ID" value={device.deviceId?.toString()} />
          <InfoRow label="Serial Number" value={device.serialNumber} />
          <InfoRow label="Model" value={device.deviceModelName} />
          <InfoRow label="Version" value={device.deviceModelVersion} />
          <InfoRow label="Common Name" value={device.commonName} />
          <InfoRow label="Activated" value={device.activated ? "Yes" : "No"} />
        </div>
      </div>

      {device.certificate && (
        <div className="mt-6 rounded-md border p-6">
          <h2 className="text-lg font-semibold mb-2">Certificate</h2>
          <pre className="text-xs bg-muted p-4 rounded overflow-x-auto max-h-40">
            {device.certificate}
          </pre>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}
