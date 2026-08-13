"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReceiptStatusBadge } from "@/components/status-badge";
import { DeviceStatusButton } from "@/components/admin/device-status-button";
import { DeviceConfigButton } from "@/components/admin/device-config-button";
import { Lock, Unlock, RefreshCw, Loader2 } from "lucide-react";

interface DeviceInfo {
  id: string;
  deviceId: number | null;
  serialNumber: string | null;
  deviceModelName: string | null;
  deviceModelVersion: string | null;
  activated: boolean | null;
  hasCertificate: boolean;
  hasKeyMaterial: boolean;
  commonName: string | null;
}

interface FiscalDayInfo {
  id: string;
  fiscalDayNo: number;
  status: string;
  openedAt: string;
  receiptCounter: number | null;
}

interface ZimraStatus {
  fiscalDayStatus?: string;
  lastFiscalDayNo?: number;
  lastReceiptGlobalNo?: number;
  fiscalDayReconciliationMode?: string;
}

interface ZimraConfig {
  taxPayerName?: string;
  taxPayerTIN?: string;
  vatNumber?: string;
  deviceSerialNo?: string;
  deviceBranchName?: string;
  deviceBranchAddress?: { province?: string; street?: string; houseNo?: string; city?: string };
  deviceBranchContacts?: { phoneNo?: string; email?: string };
  deviceOperatingMode?: string;
  taxPayerDayMaxHrs?: number;
  certificateValidTill?: string;
}

interface DeviceDetailData {
  device: DeviceInfo;
  fiscalDay: FiscalDayInfo | null;
  zimraStatus: ZimraStatus | null;
  zimraConfig: ZimraConfig | null;
}

interface Receipt {
  id: string;
  receiptGlobalNo: number | null;
  externalReference: string;
  status: string;
  receivedAt: string | null;
}

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deviceUuid = params.deviceId as string;

  const [data, setData] = useState<DeviceDetailData | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<"open" | "close" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchData(silent = false) {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const detailRes = await fetch(`/api/tenant/device/${deviceUuid}/detail`);
      const detailData = await detailRes.json();
      if (detailRes.ok) setData(detailData);

      try {
        const receiptsRes = await fetch(`/api/tenant/receipts?limit=10`);
        const receiptsData = await receiptsRes.json();
        if (receiptsRes.ok) setReceipts(receiptsData.data || []);
      } catch {}
    } catch {
      setError("Failed to load device details");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (deviceUuid) fetchData();
  }, [deviceUuid]);

  async function handleOpenDay() {
    if (!data?.device.deviceId) return;
    setActionLoading("open");
    setError(null);
    try {
      const res = await fetch("/api/tenant/device/open-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: data.device.deviceId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error?.message || "Failed to open fiscal day");
      await fetchData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCloseDay() {
    if (!data?.device.deviceId) return;
    setActionLoading("close");
    setError(null);
    try {
      const res = await fetch("/api/tenant/device/close-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: data.device.deviceId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error?.message || "Failed to close fiscal day");
      await fetchData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <div className="py-20 text-center text-muted-foreground">Device not found</div>;
  }

  const { device, fiscalDay, zimraStatus, zimraConfig } = data;
  const hasOpenDay = !!fiscalDay;

  return (
    <div>
      <PageHeader
        title={`Device ${device.deviceId || "—"}`}
        description={device.serialNumber || ""}
        breadcrumbs={[
          { label: "Devices", href: "/devices" },
          { label: `Device ${device.deviceId}`, href: "#" },
        ]}
      >
        <div className="flex items-center gap-2">
          <Badge variant={device.activated ? "default" : "secondary"}>
            {device.activated ? "Activated" : "Not Activated"}
          </Badge>
          {hasOpenDay && (
            <Badge variant="default" className="bg-green-600">Day #{fiscalDay.fiscalDayNo} Open</Badge>
          )}
          <DeviceStatusButton
            endpoint="/api/tenant/device/status"
            deviceId={device.deviceId!}
            deviceModelName={device.deviceModelName}
            deviceModelVersion={device.deviceModelVersion}
            onSuccess={() => fetchData(true)}
          />
          <DeviceConfigButton
            endpoint="/api/tenant/device/config"
            deviceId={device.deviceId!}
            deviceModelName={device.deviceModelName}
            deviceModelVersion={device.deviceModelVersion}
          />
          <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </PageHeader>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Device Config */}
      {zimraConfig && (
        <div className="rounded-md border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Device Configuration</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <InfoRow label="Taxpayer Name" value={zimraConfig.taxPayerName} />
              <InfoRow label="TIN" value={zimraConfig.taxPayerTIN} />
              <InfoRow label="VAT Number" value={zimraConfig.vatNumber} />
              <InfoRow label="Branch Name" value={zimraConfig.deviceBranchName} />
              <InfoRow label="Operating Mode" value={zimraConfig.deviceOperatingMode} />
            </div>
            <div className="space-y-2">
              <InfoRow label="Branch Address" value={
                zimraConfig.deviceBranchAddress
                  ? [zimraConfig.deviceBranchAddress.street, zimraConfig.deviceBranchAddress.city, zimraConfig.deviceBranchAddress.province].filter(Boolean).join(", ")
                  : undefined
              } />
              <InfoRow label="Contact" value={
                zimraConfig.deviceBranchContacts
                  ? [zimraConfig.deviceBranchContacts.phoneNo, zimraConfig.deviceBranchContacts.email].filter(Boolean).join(" / ")
                  : undefined
              } />
              <InfoRow label="Max Hours/Day" value={zimraConfig.taxPayerDayMaxHrs ? String(zimraConfig.taxPayerDayMaxHrs) : undefined} />
              <InfoRow label="Certificate Valid Till" value={zimraConfig.certificateValidTill} />
            </div>
          </div>
        </div>
      )}

      {/* ZIMRA Status */}
      {zimraStatus && (
        <div className="rounded-md border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">ZIMRA Status</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <InfoRow label="Fiscal Day Status" value={zimraStatus.fiscalDayStatus} />
              <InfoRow label="Fiscal Day No" value={zimraStatus.lastFiscalDayNo ? String(zimraStatus.lastFiscalDayNo) : undefined} />
            </div>
            <div className="space-y-2">
              <InfoRow label="Last Receipt Global No" value={zimraStatus.lastReceiptGlobalNo ? String(zimraStatus.lastReceiptGlobalNo) : undefined} />
              <InfoRow label="Reconciliation Mode" value={zimraStatus.fiscalDayReconciliationMode} />
            </div>
          </div>
        </div>
      )}

      {/* Open / Close Fiscal Day */}
      <div className="rounded-md border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Fiscal Day</h2>
          <div className="flex gap-2">
            {!hasOpenDay ? (
              <Button
                size="sm"
                onClick={handleOpenDay}
                disabled={actionLoading === "open" || !device.activated || !device.hasCertificate}
              >
                {actionLoading === "open" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Unlock className="h-4 w-4 mr-1" />
                )}
                Open Day
              </Button>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleCloseDay}
                disabled={actionLoading === "close"}
              >
                {actionLoading === "close" ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4 mr-1" />
                )}
                Close Day
              </Button>
            )}
          </div>
        </div>

        {fiscalDay ? (
          <div className="grid gap-4 md:grid-cols-3">
            <InfoRow label="Day Number" value={String(fiscalDay.fiscalDayNo)} />
            <InfoRow label="Status" value={fiscalDay.status} />
            <InfoRow label="Receipts Today" value={String(fiscalDay.receiptCounter ?? 0)} />
            <InfoRow label="Opened At" value={fiscalDay.openedAt ? new Date(fiscalDay.openedAt).toLocaleString() : "—"} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No fiscal day is open. Click "Open Day" to start a new fiscal day.
          </p>
        )}
      </div>

      {/* Device Info */}
      <div className="rounded-md border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Device Info</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <InfoRow label="Device ID" value={device.deviceId ? String(device.deviceId) : "—"} />
          <InfoRow label="Serial" value={device.serialNumber || "—"} />
          <InfoRow label="Model" value={device.deviceModelName || "—"} />
          <InfoRow label="Version" value={device.deviceModelVersion || "—"} />
          <InfoRow label="Common Name" value={device.commonName || "—"} />
          <InfoRow label="Certificate" value={device.hasCertificate ? "Installed" : "Missing"} />
          <InfoRow label="Key Material" value={device.hasKeyMaterial ? "Installed" : "Missing"} />
        </div>
      </div>

      {/* Recent Receipts */}
      <div className="rounded-md border p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Receipts</h2>
        {receipts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No receipts</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">External Ref</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Received</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/receipts/${r.id}`)}>
                  <td className="px-4 py-3 text-sm font-medium">{r.receiptGlobalNo}</td>
                  <td className="px-4 py-3 text-sm">{r.externalReference}</td>
                  <td className="px-4 py-3 text-sm">
                    <ReceiptStatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {r.receivedAt ? new Date(r.receivedAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-sm text-muted-foreground min-w-[140px]">{label}</span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  );
}
