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
import { Settings } from "lucide-react";

interface DeviceBranchAddress {
  province?: string;
  street?: string;
  houseNo?: string;
  city?: string;
}

interface DeviceBranchContacts {
  phoneNo?: string;
  email?: string;
}

interface ApplicableTax {
  taxID?: number;
  taxPercent?: number;
  taxName?: string;
  taxValidFrom?: string;
  taxValidTill?: string;
  exempt?: boolean;
  zeroRated?: boolean;
  vatRated?: boolean;
}

interface DeviceConfigData {
  operationID?: string;
  taxPayerName?: string;
  taxPayerTIN?: string;
  vatNumber?: string;
  deviceSerialNo?: string;
  deviceBranchName?: string;
  deviceBranchAddress?: DeviceBranchAddress;
  deviceBranchContacts?: DeviceBranchContacts;
  deviceOperatingMode?: string;
  taxPayerDayMaxHrs?: number;
  applicableTaxes?: ApplicableTax[];
  certificateValidTill?: string;
  qrUrl?: string;
  taxpayerDayEndNotificationHrs?: number;
}

interface DeviceConfigButtonProps {
  clientId?: string;
  deviceId: number;
  deviceModelName?: string | null;
  deviceModelVersion?: string | null;
  endpoint?: string;
}

export function DeviceConfigButton({
  clientId,
  deviceId,
  deviceModelName,
  deviceModelVersion,
  endpoint,
}: DeviceConfigButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<DeviceConfigData | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const url =
        endpoint || `/api/admin/clients/${clientId}/device/config`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceID: deviceId,
          deviceModelName: deviceModelName || "FiscalEdge",
          deviceModelVersion: deviceModelVersion || "1.0.0",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch config");
      setConfig(data.data || data);
      setOpen(true);
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch device configuration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={fetchConfig}
        disabled={loading}
      >
        <Settings className="h-4 w-4 mr-1" />
        {loading ? "Loading..." : "Get Config"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Device Configuration</DialogTitle>
          </DialogHeader>
          {config && (
            <div className="space-y-4 py-2">
              <Section title="Taxpayer">
                <InfoItem label="Name" value={config.taxPayerName} />
                <InfoItem label="TIN" value={config.taxPayerTIN} />
                <InfoItem label="VAT Number" value={config.vatNumber} />
              </Section>

              <Section title="Device">
                <InfoItem label="Serial No" value={config.deviceSerialNo} />
                <InfoItem label="Operating Mode" value={config.deviceOperatingMode} />
                <InfoItem label="Certificate Valid Till" value={config.certificateValidTill} />
                <InfoItem label="Operation ID" value={config.operationID} />
              </Section>

              <Section title="Branch">
                <InfoItem label="Branch Name" value={config.deviceBranchName} />
                {config.deviceBranchAddress && (
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <InfoItem label="Province" value={config.deviceBranchAddress.province} />
                    <InfoItem label="City" value={config.deviceBranchAddress.city} />
                    <InfoItem label="Street" value={config.deviceBranchAddress.street} />
                    <InfoItem label="House No" value={config.deviceBranchAddress.houseNo} />
                  </div>
                )}
                {config.deviceBranchContacts && (
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <InfoItem label="Phone" value={config.deviceBranchContacts.phoneNo} />
                    <InfoItem label="Email" value={config.deviceBranchContacts.email} />
                  </div>
                )}
              </Section>

              <Section title="Settings">
                <InfoItem label="Taxpayer Day Max Hours" value={config.taxPayerDayMaxHrs?.toString()} />
                <InfoItem label="Day End Notification Hours" value={config.taxpayerDayEndNotificationHrs?.toString()} />
                {config.qrUrl && <InfoItem label="QR URL" value={config.qrUrl} />}
              </Section>

              {config.applicableTaxes && config.applicableTaxes.length > 0 && (
                <Section title="Applicable Taxes">
                  <div className="rounded border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted">
                          <th className="px-3 py-1.5 text-left">Name</th>
                          <th className="px-3 py-1.5 text-right">%</th>
                          <th className="px-3 py-1.5 text-center">Exempt</th>
                          <th className="px-3 py-1.5 text-center">Zero</th>
                          <th className="px-3 py-1.5 text-center">VAT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {config.applicableTaxes.map((t, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-1.5">{t.taxName}</td>
                            <td className="px-3 py-1.5 text-right">{t.taxPercent}%</td>
                            <td className="px-3 py-1.5 text-center">{t.exempt ? "Yes" : "No"}</td>
                            <td className="px-3 py-1.5 text-center">{t.zeroRated ? "Yes" : "No"}</td>
                            <td className="px-3 py-1.5 text-center">{t.vatRated ? "Yes" : "No"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="grid gap-2 md:grid-cols-2">{children}</div>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}
