import { resolveClient } from "@/lib/tenant";
import { OrgNotConfigured } from "@/components/layout/org-not-configured";
import { db } from "@/db";
import { devices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function DevicesPage() {
  const resolved = await resolveClient();
  if (!resolved) return <OrgNotConfigured />;
  const { client } = resolved;

  const deviceList = await db.query.devices.findMany({
    where: eq(devices.clientId, client.id),
  });

  return (
    <div>
      <PageHeader
        title="Devices"
        description="View your registered fiscal devices"
      />
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Device ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Serial</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Model</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {deviceList.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No devices registered
                </td>
              </tr>
            ) : (
              deviceList.map((device) => {
                const href = `/devices/${device.id}`;
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
