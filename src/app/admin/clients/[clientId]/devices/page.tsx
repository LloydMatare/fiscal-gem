import { db } from "@/db";
import { clients, devices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/tenant";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { CreateDeviceButton } from "@/components/admin/create-device-button";
import Link from "next/link";

export default async function AdminDevicesPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  await requireAdminPage();
  const { clientId } = await params;

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
  });
  if (!client) notFound();

  const deviceList = await db.query.devices.findMany({
    where: eq(devices.clientId, clientId),
  });

  return (
    <div>
      <PageHeader
        title="Devices"
        description={`Devices for ${client.name}`}
        breadcrumbs={[
          { label: "Clients", href: "/admin/clients" },
          { label: client.name, href: `/admin/clients/${clientId}` },
          { label: "Devices", href: "#" },
        ]}
      >
        <CreateDeviceButton clientId={clientId} />
      </PageHeader>

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Device ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Serial Number</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Model</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {deviceList.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No devices found
                </td>
              </tr>
            ) : (
              deviceList.map((device) => {
                const href = `/admin/clients/${clientId}/devices/${device.id}`;
                return (
                  <tr key={device.id} className="border-b hover:bg-muted/50 cursor-pointer">
                    <td className="px-4 py-3 text-sm font-medium">
                      <Link href={href} className="block">{device.deviceId || "—"}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={href} className="block">{device.serialNumber || "—"}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={href} className="block">{device.deviceModelName || "—"}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={href} className="block">
                        <Badge variant={device.activated ? "default" : "secondary"}>
                          {device.activated ? "Active" : "Inactive"}
                        </Badge>
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
