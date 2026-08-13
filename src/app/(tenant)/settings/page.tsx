import { resolveClient } from "@/lib/tenant";
import { OrgNotConfigured } from "@/components/layout/org-not-configured";
import { PageHeader } from "@/components/layout/page-header";
import { db } from "@/db";
import { devices, fiscalDays } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { DeviceStatusConfig } from "./device-status-config";

export default async function SettingsPage() {
  const resolved = await resolveClient();
  if (!resolved) return <OrgNotConfigured />;
  const { client } = resolved;

  const deviceList = await db.query.devices.findMany({
    where: eq(devices.clientId, client.id),
  });

  const openDays = await db.query.fiscalDays.findMany({
    where: and(
      eq(fiscalDays.clientId, client.id),
      eq(fiscalDays.status, "OPENED")
    ),
  });

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your organization settings"
      />
      <div className="space-y-6">
        <div className="rounded-md border p-6">
          <h2 className="text-lg font-semibold mb-4">Tax Information</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <InfoRow label="Tax ID" value={client.taxId} />
            <InfoRow label="Registration Number" value={client.registrationNumber} />
            <InfoRow label="Currency" value={client.currency} />
            <InfoRow label="Time Zone" value={client.timeZone} />
          </div>
        </div>

        <DeviceStatusConfig
          devices={deviceList.map((d) => {
            const openDay = openDays.find((f) => f.deviceId === d.id);
            return {
              id: d.id,
              deviceId: d.deviceId,
              serialNumber: d.serialNumber,
              deviceModelName: d.deviceModelName,
              deviceModelVersion: d.deviceModelVersion,
              activated: d.activated,
              fiscalDay: openDay
                ? {
                    fiscalDayNo: openDay.fiscalDayNo,
                    openedAt: openDay.fiscalDayOpened.toISOString(),
                  }
                : null,
            };
          })}
        />
      </div>
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
