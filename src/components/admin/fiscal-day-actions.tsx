"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CalendarCheck, CalendarX } from "lucide-react";

interface FiscalDayActionsProps {
  clientId: string;
  deviceId: number;
  deviceModelName?: string | null;
  deviceModelVersion?: string | null;
}

export function FiscalDayActions({
  clientId,
  deviceId,
  deviceModelName,
  deviceModelVersion,
}: FiscalDayActionsProps) {
  const router = useRouter();
  const [openDayOpen, setOpenDayOpen] = useState(false);
  const [closeDayOpen, setCloseDayOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fiscalDayNo, setFiscalDayNo] = useState("1");

  const handleOpenDay = async () => {
    setLoading(true);
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
      setOpenDayOpen(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to open fiscal day");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDay = async () => {
    setLoading(true);
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
            fiscalDayNo: Number(fiscalDayNo) || 1,
            fiscalDayClosed: new Date().toISOString(),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to close day");
      toast.success("Fiscal day closed");
      setCloseDayOpen(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to close fiscal day");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpenDayOpen(true)}>
        <CalendarCheck className="h-4 w-4 mr-1" /> Open Day
      </Button>
      <Button variant="outline" size="sm" onClick={() => setCloseDayOpen(true)}>
        <CalendarX className="h-4 w-4 mr-1" /> Close Day
      </Button>

      {/* Open Day Dialog */}
      <Dialog open={openDayOpen} onOpenChange={setOpenDayOpen}>
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
              <Button variant="outline" onClick={() => setOpenDayOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleOpenDay} disabled={loading}>
                {loading ? "Opening..." : "Open Day"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Day Dialog */}
      <Dialog open={closeDayOpen} onOpenChange={setCloseDayOpen}>
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
              <Button variant="outline" onClick={() => setCloseDayOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCloseDay} disabled={loading}>
                {loading ? "Closing..." : "Close Day"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
