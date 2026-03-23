"use client";

import { useState } from "react";
import { openDayAction, closeDayAction } from "@/lib/actions/devices";
import { toast } from "sonner";
import { Loader2, PlayCircle, StopCircle } from "lucide-react";

interface FiscalDayControlsProps {
  deviceId: string;
  currentDayStatus: "open" | "closed" | "closing" | null;
}

export function FiscalDayControls({ deviceId, currentDayStatus }: FiscalDayControlsProps) {
  const [loading, setLoading] = useState(false);

  async function handleOpenDay() {
    setLoading(true);
    try {
      const result = await openDayAction(deviceId);
      if (result.success) {
        toast.success("Fiscal day opened successfully");
      } else {
        toast.error(result.error || "Failed to open fiscal day");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleCloseDay() {
    setLoading(true);
    try {
      const result = await closeDayAction(deviceId);
      if (result.success) {
        toast.success("Fiscal day closed successfully");
      } else {
        toast.error(result.error || "Failed to close fiscal day");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {currentDayStatus === "open" ? (
        <button
          onClick={handleCloseDay}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <StopCircle className="h-3.5 w-3.5" />
          )}
          Close Day
        </button>
      ) : (
        <button
          onClick={handleOpenDay}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-600 transition-colors hover:bg-green-100 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <PlayCircle className="h-3.5 w-3.5" />
          )}
          Open Day
        </button>
      )}
    </div>
  );
}
