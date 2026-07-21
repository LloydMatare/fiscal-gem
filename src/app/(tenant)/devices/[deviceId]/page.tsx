import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { clients, devices, fiscalDays, receipts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ReceiptStatusBadge } from "@/components/status-badge";

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect("/sign-in");

  const client = await db.query.clients.findFirst({
    where: eq(clients.clerkOrgId, orgId),
  });
  if (!client) redirect("/");

  const { deviceId } = await params;
  const device = await db.query.devices.findFirst({
    where: and(eq(devices.id, deviceId), eq(devices.clientId, client.id)),
  });
  if (!device) notFound();

  const deviceFiscalDays = await db.query.fiscalDays.findMany({
    where: eq(fiscalDays.deviceId, deviceId),
    orderBy: [desc(fiscalDays.fiscalDayNo)],
  });

  const deviceReceipts = await db.query.receipts.findMany({
    where: eq(receipts.deviceId, deviceId),
    orderBy: [desc(receipts.receivedAt)],
    limit: 10,
  });

  return (
    <div>
      <PageHeader
        title={`Device ${device.deviceId || "—"}`}
        description={device.serialNumber || ""}
        breadcrumbs={[
          { label: "Devices", href: "/devices" },
          { label: `Device ${device.deviceId}`, href: "#" },
        ]}
      >
        <Badge variant={device.activated ? "default" : "secondary"}>
          {device.activated ? "Activated" : "Not Activated"}
        </Badge>
      </PageHeader>

      <div className="rounded-md border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Fiscal Days</h2>
        {deviceFiscalDays.length === 0 ? (
          <p className="text-sm text-muted-foreground">No fiscal days</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Day #</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Receipts</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Opened</th>
              </tr>
            </thead>
            <tbody>
              {deviceFiscalDays.map((day) => (
                <tr key={day.id} className="border-b">
                  <td className="px-4 py-3 text-sm font-medium">{day.fiscalDayNo}</td>
                  <td className="px-4 py-3 text-sm">
                    <Badge variant={day.status === "OPENED" ? "default" : "secondary"}>
                      {day.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">{day.receiptCounter || 0}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {day.fiscalDayOpened?.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-md border p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Receipts</h2>
        {deviceReceipts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No receipts</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">External Ref</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Received</th>
              </tr>
            </thead>
            <tbody>
              {deviceReceipts.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="px-4 py-3 text-sm font-medium">{r.receiptGlobalNo}</td>
                  <td className="px-4 py-3 text-sm">{r.externalReference}</td>
                  <td className="px-4 py-3 text-sm">
                    <ReceiptStatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {r.receivedAt?.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
