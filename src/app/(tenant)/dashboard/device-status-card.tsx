"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Smartphone } from "lucide-react";

interface DeviceStatusData {
  operationID?: string;
  fiscalDayStatus?: string;
  fiscalDayReconciliationMode?: string;
  fiscalDayClosed?: string;
  lastReceiptGlobalNo?: number;
  lastFiscalDayNo?: number;
  fiscalDayClosingErrorCode?: string;
}

export interface DashboardDevice {
  id: string;
  deviceId: number | null;
  serialNumber: string | null;
  deviceModelName: string | null;
  deviceModelVersion: string | null;
  activated: boolean | null;
}

interface DeviceStatusState {
  loading: boolean;
  data: DeviceStatusData | null;
  error: string | null;
}

export function DeviceStatusCard({ devices }: { devices: DashboardDevice[] }) {
  const [states, setStates] = useState<Record<string, DeviceStatusState>>({});

  const fetchStatus = useCallback(async (device: DashboardDevice) => {
    if (!device.deviceId) return;
    setStates((prev) => ({
      ...prev,
      [device.id]: { loading: true, data: prev[device.id]?.data ?? null, error: null },
    }));
    try {
      const res = await fetch("/api/tenant/device/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceID: device.deviceId,
          deviceModelName: device.deviceModelName || "FiscalEdge",
          deviceModelVersion: device.deviceModelVersion || "1.0.0",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to fetch device status");
      }
      setStates((prev) => ({
        ...prev,
        [device.id]: { loading: false, data: json.data ?? json, error: null },
      }));
    } catch (e) {
      setStates((prev) => ({
        ...prev,
        [device.id]: {
          loading: false,
          data: prev[device.id]?.data ?? null,
          error: e instanceof Error ? e.message : "Failed to fetch device status",
        },
      }));
    }
  }, []);

  useEffect(() => {
    devices.forEach((d) => fetchStatus(d));
  }, [devices, fetchStatus]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Device Status
        </CardTitle>
        <Smartphone className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        {devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No devices registered</p>
        ) : (
          devices.map((device) => {
            const state = states[device.id] ?? { loading: true, data: null, error: null };
            const dayOpen = state.data?.fiscalDayStatus === "OPENED";
            return (
              <div key={device.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      Device #{device.deviceId ?? "—"}
                    </p>
                    <Badge variant={device.activated ? "default" : "secondary"}>
                      {device.activated ? "Active" : "Inactive"}
                    </Badge>
                    {state.data ? (
                      <Badge variant={dayOpen ? "default" : "secondary"} className={dayOpen ? "bg-green-600" : ""}>
                        {dayOpen ? "Day Open" : "Day Closed"}
                      </Badge>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={state.loading}
                    onClick={() => fetchStatus(device)}
                  >
                    {state.loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {[device.serialNumber, device.deviceModelName, device.deviceModelVersion]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>

                {!device.deviceId ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    No ZIMRA device ID assigned
                  </p>
                ) : state.error ? (
                  <p className="mt-2 text-xs text-red-600">{state.error}</p>
                ) : state.loading && !state.data ? (
                  <p className="mt-2 text-xs text-muted-foreground">Loading status...</p>
                ) : state.data ? (
                  <div className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">Last fiscal day: </span>
                      <span className="font-medium">{state.data.lastFiscalDayNo ?? "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last receipt no: </span>
                      <span className="font-medium">{state.data.lastReceiptGlobalNo ?? "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reconciliation: </span>
                      <span className="font-medium">{state.data.fiscalDayReconciliationMode || "—"}</span>
                    </div>
                    {state.data.fiscalDayClosed && (
                      <div>
                        <span className="text-muted-foreground">Closed at: </span>
                        <span className="font-medium">
                          {new Date(state.data.fiscalDayClosed).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {state.data.fiscalDayClosingErrorCode && (
                      <div className="text-red-600">
                        <span className="text-muted-foreground">Closing error: </span>
                        <span className="font-medium">{state.data.fiscalDayClosingErrorCode}</span>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
