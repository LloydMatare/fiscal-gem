"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Activity } from "lucide-react";

interface DeviceStatusData {
  operationID?: string;
  fiscalDayStatus?: string;
  fiscalDayReconciliationMode?: string;
  fiscalDayClosed?: string;
  lastReceiptGlobalNo?: number;
  lastFiscalDayNo?: number;
  fiscalDayClosingErrorCode?: string;
  fiscalDayCounter?: Array<{
    fiscalCounterType?: string;
    fiscalCounterCurrency?: string;
    fiscalCounterTaxPercent?: number;
    fiscalCounterMoneyType?: string;
    fiscalCounterValue?: number;
  }>;
  fiscalDayDocumentQuantities?: Array<{
    receiptType?: string;
    receiptCurrency?: string;
    receiptQuantity?: number;
    receiptTotalAmount?: number;
  }>;
}

interface DeviceStatusButtonProps {
  clientId: string;
  deviceId: number;
  deviceModelName?: string | null;
  deviceModelVersion?: string | null;
}

export function DeviceStatusButton({
  clientId,
  deviceId,
  deviceModelName,
  deviceModelVersion,
}: DeviceStatusButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<DeviceStatusData | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch status");
      setStatus(data.data || data);
      setOpen(true);
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch device status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={fetchStatus}
        disabled={loading}
      >
        <Activity className="h-4 w-4 mr-1" />
        {loading ? "Checking..." : "Check Status"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Device Status</DialogTitle>
          </DialogHeader>
          {status && (
            <div className="space-y-4 py-2">
              <div className="grid gap-3 md:grid-cols-2">
                <InfoItem label="Fiscal Day Status" value={status.fiscalDayStatus} />
                <InfoItem label="Reconciliation Mode" value={status.fiscalDayReconciliationMode} />
                <InfoItem label="Last Receipt No" value={status.lastReceiptGlobalNo?.toString()} />
                <InfoItem label="Last Fiscal Day" value={status.lastFiscalDayNo?.toString()} />
                <InfoItem label="Fiscal Day Closed" value={status.fiscalDayClosed} />
                <InfoItem label="Operation ID" value={status.operationID} />
                {status.fiscalDayClosingErrorCode && (
                  <InfoItem
                    label="Closing Error"
                    value={status.fiscalDayClosingErrorCode}
                    className="text-red-600"
                  />
                )}
              </div>

              {status.fiscalDayCounter && status.fiscalDayCounter.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Fiscal Counters</h3>
                  <div className="rounded border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted">
                          <th className="px-3 py-1.5 text-left">Type</th>
                          <th className="px-3 py-1.5 text-left">Currency</th>
                          <th className="px-3 py-1.5 text-right">Tax %</th>
                          <th className="px-3 py-1.5 text-left">Money</th>
                          <th className="px-3 py-1.5 text-right">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {status.fiscalDayCounter.map((c, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-1.5">{c.fiscalCounterType}</td>
                            <td className="px-3 py-1.5">{c.fiscalCounterCurrency}</td>
                            <td className="px-3 py-1.5 text-right">{c.fiscalCounterTaxPercent}</td>
                            <td className="px-3 py-1.5">{c.fiscalCounterMoneyType}</td>
                            <td className="px-3 py-1.5 text-right">{c.fiscalCounterValue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {status.fiscalDayDocumentQuantities && status.fiscalDayDocumentQuantities.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Document Quantities</h3>
                  <div className="rounded border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted">
                          <th className="px-3 py-1.5 text-left">Type</th>
                          <th className="px-3 py-1.5 text-left">Currency</th>
                          <th className="px-3 py-1.5 text-right">Quantity</th>
                          <th className="px-3 py-1.5 text-right">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {status.fiscalDayDocumentQuantities.map((d, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-1.5">{d.receiptType}</td>
                            <td className="px-3 py-1.5">{d.receiptCurrency}</td>
                            <td className="px-3 py-1.5 text-right">{d.receiptQuantity}</td>
                            <td className="px-3 py-1.5 text-right">{d.receiptTotalAmount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function InfoItem({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | number | null;
  className?: string;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-sm font-medium ${className || ""}`}>
        {value || "—"}
      </dd>
    </div>
  );
}
