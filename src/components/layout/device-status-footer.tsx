"use client";

import { useEffect, useState } from "react";
import { Smartphone, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeviceInfo {
  deviceId: number | null;
  activated: boolean | null;
  hasCertificate: boolean;
  hasKeyMaterial: boolean;
}

interface FiscalDayInfo {
  fiscalDayNo: number;
  status: string;
  openedAt: string;
  receiptCounter: number | null;
}

interface DeviceStatusResponse {
  device: DeviceInfo | null;
  fiscalDay: FiscalDayInfo | null;
}

export function DeviceStatusFooter() {
  const [status, setStatus] = useState<DeviceStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        // First get the device ID from client devices
        const devRes = await fetch("/api/tenant/devices?limit=1");
        const devData = await devRes.json();
        const device = devData.data?.[0];
        if (!device?.deviceId) {
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/tenant/device-status?deviceId=${device.deviceId}`);
        const data = await res.json();
        if (data.device) setStatus(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return null;
  if (!status?.device) return null;

  const { device, fiscalDay } = status;
  const isActivated = device.activated;
  const hasFiscalDay = !!fiscalDay;
  const deviceReady = isActivated && device.hasCertificate && device.hasKeyMaterial;

  let statusColor: string;
  let statusIcon: React.ReactNode;
  let statusText: string;

  if (!deviceReady) {
    statusColor = "text-red-500";
    statusIcon = <XCircle className="h-3.5 w-3.5" />;
    statusText = "Not Ready";
  } else if (!hasFiscalDay) {
    statusColor = "text-yellow-500";
    statusIcon = <AlertTriangle className="h-3.5 w-3.5" />;
    statusText = "No Fiscal Day";
  } else {
    statusColor = "text-green-500";
    statusIcon = <CheckCircle2 className="h-3.5 w-3.5" />;
    statusText = `Day #${fiscalDay.fiscalDayNo}`;
  }

  return (
    <div className="border-t px-3 py-3 space-y-1.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Smartphone className="h-3.5 w-3.5" />
        <span className="font-medium">Device {device.deviceId}</span>
      </div>
      <div className={cn("flex items-center gap-1.5 text-xs", statusColor)}>
        {statusIcon}
        <span className="font-medium">{statusText}</span>
      </div>
      {fiscalDay && (
        <div className="text-[10px] text-muted-foreground pl-5">
          {fiscalDay.receiptCounter ?? 0} receipts today
        </div>
      )}
    </div>
  );
}
