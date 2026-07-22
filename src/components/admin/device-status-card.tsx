"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CalendarCheck,
  CalendarX,
  RefreshCw,
  Activity,
  FileText,
  Hash,
} from "lucide-react";

interface DeviceStatusData {
  fiscalDayStatus?: string;
  lastReceiptGlobalNo?: number;
  lastFiscalDayNo?: number;
  operationID?: string;
}

interface DeviceStatusCardProps {
  clientId: string;
  deviceId: number;
  deviceModelName?: string | null;
  deviceModelVersion?: string | null;
}

export function DeviceStatusCard({
  clientId,
  deviceId,
  deviceModelName,
  deviceModelVersion,
}: DeviceStatusCardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<DeviceStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [fiscalDayNo, setFiscalDayNo] = useState("1");
  const [dialogOpen, setDialogOpen] = useState<"open" | "close" | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/clients/${clientId}/device/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceID: deviceId,
            deviceModelName: deviceModelName || "FiscalEdge",
            deviceModelVersion: deviceModelVersion || "1.0.0",
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setStatus(data.data || data);
      }
    } catch {
      // silently fail — status card just won't update
    } finally {
      setLoading(false);
    }
  }, [clientId, deviceId, deviceModelName, deviceModelVersion]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const isOpen = status?.fiscalDayStatus === "FiscalDayOpened";
  const isClosed = status?.fiscalDayStatus === "FiscalDayClosed";

  const handleOpenDay = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/admin/clients/${clientId}/device/open-day`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceID: deviceId,
            deviceModelName: deviceModelName || "FiscalEdge",
            deviceModelVersion: deviceModelVersion || "1.0.0",
            request: {
              fiscalDayNo: Number(fiscalDayNo) || 1,
              fiscalDayOpened: new Date().toISOString(),
            },
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to open day");
      toast.success(`Fiscal day ${data.data?.fiscalDayNo || fiscalDayNo} opened`);
      setDialogOpen(null);
      await fetchStatus();
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to open fiscal day");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseDay = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/admin/clients/${clientId}/device/close-day`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceID: deviceId,
            deviceModelName: deviceModelName || "FiscalEdge",
            deviceModelVersion: deviceModelVersion || "1.0.0",
            fiscalDayNo: Number(fiscalDayNo) || status?.lastFiscalDayNo || 1,
            fiscalDayClosed: new Date().toISOString(),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to close day");
      toast.success("Fiscal day closed");
      setDialogOpen(null);
      await fetchStatus();
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to close fiscal day");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-md border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Fiscal Day Status</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLoading(true);
              fetchStatus();
            }}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {loading && !status ? (
          <p className="text-sm text-muted-foreground">Loading status...</p>
        ) : !status ? (
          <p className="text-sm text-muted-foreground">Could not retrieve status</p>
        ) : (
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge variant={isOpen ? "default" : isClosed ? "secondary" : "outline"}>
                {status.fiscalDayStatus || "Unknown"}
              </Badge>
            </div>

            {status.lastFiscalDayNo != null && (
              <div className="flex items-center gap-1.5 text-sm">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Fiscal Day</span>
                <span className="font-medium">{status.lastFiscalDayNo}</span>
              </div>
            )}

            {status.lastReceiptGlobalNo != null && (
              <div className="flex items-center gap-1.5 text-sm">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Last Receipt</span>
                <span className="font-medium">{status.lastReceiptGlobalNo}</span>
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                disabled={isOpen || loading}
                onClick={() => {
                  setFiscalDayNo(String((status.lastFiscalDayNo || 0) + 1));
                  setDialogOpen("open");
                }}
              >
                <CalendarCheck className="h-4 w-4 mr-1" /> Open Day
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isClosed || loading}
                onClick={() => {
                  setFiscalDayNo(String(status.lastFiscalDayNo || 1));
                  setDialogOpen("close");
                }}
              >
                <CalendarX className="h-4 w-4 mr-1" /> Close Day
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Open Day Dialog */}
      <Dialog open={dialogOpen === "open"} onOpenChange={() => setDialogOpen(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Open Fiscal Day</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              type="number"
              placeholder="Fiscal Day Number"
              value={fiscalDayNo}
              onChange={(e) => setFiscalDayNo(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Opens a new fiscal day on device {deviceId}. A fiscal day must be
              opened before processing transactions.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(null)}>
                Cancel
              </Button>
              <Button onClick={handleOpenDay} disabled={actionLoading}>
                {actionLoading ? "Opening..." : "Open Day"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Day Dialog */}
      <Dialog open={dialogOpen === "close"} onOpenChange={() => setDialogOpen(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Close Fiscal Day</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              type="number"
              placeholder="Fiscal Day Number"
              value={fiscalDayNo}
              onChange={(e) => setFiscalDayNo(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Closes the current fiscal day on device {deviceId}. This generates
              the closing information required by ZIMRA.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(null)}>
                Cancel
              </Button>
              <Button onClick={handleCloseDay} disabled={actionLoading}>
                {actionLoading ? "Closing..." : "Close Day"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
