"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeviceStatusButton } from "@/components/admin/device-status-button";
import { DeviceConfigButton } from "@/components/admin/device-config-button";

export interface SettingsFiscalDay {
  fiscalDayNo: number;
  openedAt: string;
}

export interface SettingsDevice {
  id: string;
  deviceId: number | null;
  serialNumber: string | null;
  deviceModelName: string | null;
  deviceModelVersion: string | null;
  activated: boolean | null;
  fiscalDay: SettingsFiscalDay | null;
}

export function DeviceStatusConfig({ devices }: { devices: SettingsDevice[] }) {
  const [dayState, setDayState] = useState<Record<string, SettingsFiscalDay | null>>(
    () => Object.fromEntries(devices.map((d) => [d.id, d.fiscalDay]))
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const runAction = async (
    device: SettingsDevice,
    action: "open" | "close"
  ) => {
    if (!device.deviceId) return;
    setActionLoading(`${device.id}:${action}`);
    try {
      const res = await fetch(`/api/tenant/device/${action}-day`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: device.deviceId }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(
          result.error?.message || result.message || `Failed to ${action} fiscal day`
        );
      }
      if (action === "open") {
        setDayState((prev) => ({
          ...prev,
          [device.id]: {
            fiscalDayNo: result.data?.fiscalDayNo ?? result.fiscalDayNo,
            openedAt: new Date().toISOString(),
          },
        }));
        toast.success(`Fiscal day opened for device #${device.deviceId}`);
      } else {
        setDayState((prev) => ({ ...prev, [device.id]: null }));
        toast.success(`Fiscal day closed for device #${device.deviceId}`);
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Action failed"
      );
    } finally {
      setActionLoading(null);
    }
  };

  if (devices.length === 0) {
    return (
      <div className="rounded-md border p-6">
        <h2 className="text-lg font-semibold mb-4">Device Status & Configuration</h2>
        <p className="text-sm text-muted-foreground">
          No devices registered. Register a device to query its status and
          configuration.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border p-6">
      <h2 className="text-lg font-semibold mb-1">Device Status & Configuration</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Query live ZIMRA status and configuration, and manage fiscal days for
        each registered device.
      </p>

      <div className="space-y-3">
        {devices.map((device) => {
          const openDay = dayState[device.id];
          const busy =
            actionLoading === `${device.id}:open` ||
            actionLoading === `${device.id}:close`;

          return (
            <div
              key={device.id}
              className="flex flex-col gap-3 rounded-md border p-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">Device #{device.deviceId ?? "—"}</p>
                  <Badge variant={device.activated ? "default" : "secondary"}>
                    {device.activated ? "Active" : "Inactive"}
                  </Badge>
                  {openDay ? (
                    <Badge variant="default" className="bg-green-600">
                      Day #{openDay.fiscalDayNo} Open
                    </Badge>
                  ) : (
                    <Badge variant="secondary">No Open Day</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {[device.serialNumber, device.deviceModelName, device.deviceModelVersion]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {openDay ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy || !device.activated}
                    onClick={() => runAction(device, "close")}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4 mr-1" />
                    )}
                    Close Day
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={busy || !device.activated || !device.deviceId}
                    onClick={() => runAction(device, "open")}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Unlock className="h-4 w-4 mr-1" />
                    )}
                    Open Day
                  </Button>
                )}
                <DeviceStatusButton
                  endpoint="/api/tenant/device/status"
                  deviceId={device.deviceId!}
                  deviceModelName={device.deviceModelName}
                  deviceModelVersion={device.deviceModelVersion}
                />
                <DeviceConfigButton
                  endpoint="/api/tenant/device/config"
                  deviceId={device.deviceId!}
                  deviceModelName={device.deviceModelName}
                  deviceModelVersion={device.deviceModelVersion}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
