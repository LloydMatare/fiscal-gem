"use client";

import { PageHeader } from "@/components/layout/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { toast } from "sonner";

interface Client {
  id: string;
  name: string;
  tenantCode: string;
  status: string;
  currency: string;
  createdAt: string;
}

const columns: Column<Client>[] = [
  { key: "name", label: "Name", sortable: true },
  { key: "tenantCode", label: "Tenant Code", sortable: true },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (row) => <StatusBadge status={row.status} />,
  },
  { key: "currency", label: "Currency" },
  {
    key: "createdAt",
    label: "Created",
    sortable: true,
    render: (row) => new Date(row.createdAt).toLocaleDateString(),
  },
];

const defaultForm = {
  name: "",
  taxId: "",
  registrationNumber: "",
  lineOfBusiness: "",
  industryCode: "",
  licenseNumber: "",
  internalReferenceCode: "",
  currency: "USD",
  timeZone: "Africa/Harare",
  notes: "",
  zimraDeviceId: "",
};

export default function ClientsPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!form.name) {
      toast.error("Name is required");
      return;
    }
    setCreating(true);
    try {
      const body = {
        ...form,
        zimraDeviceId: form.zimraDeviceId ? Number(form.zimraDeviceId) : undefined,
      };
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Client created");
      setOpen(false);
      setForm(defaultForm);
      router.refresh();
    } catch {
      toast.error("Failed to create client");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <PageHeader title="Clients" description="Manage tenant organizations">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Create Client
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Client</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Section label="Business Information">
                <Input
                  placeholder="Business name *"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <Input
                  placeholder="Line of business"
                  value={form.lineOfBusiness}
                  onChange={(e) => setForm({ ...form, lineOfBusiness: e.target.value })}
                />
                <Input
                  placeholder="Industry code"
                  value={form.industryCode}
                  onChange={(e) => setForm({ ...form, industryCode: e.target.value })}
                />
              </Section>

              <Section label="Tax & Registration">
                <Input
                  placeholder="Tax ID"
                  value={form.taxId}
                  onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                />
                <Input
                  placeholder="Registration number"
                  value={form.registrationNumber}
                  onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                />
                <Input
                  placeholder="License number"
                  value={form.licenseNumber}
                  onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                />
                <Input
                  placeholder="Internal reference code"
                  value={form.internalReferenceCode}
                  onChange={(e) => setForm({ ...form, internalReferenceCode: e.target.value })}
                />
              </Section>

              <Section label="ZIMRA Device">
                <Input
                  placeholder="ZIMRA device ID"
                  type="number"
                  value={form.zimraDeviceId}
                  onChange={(e) => setForm({ ...form, zimraDeviceId: e.target.value })}
                />
              </Section>

              <Section label="Regional Settings">
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v ?? "USD" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="ZWL">ZWL - Zimbabwean Dollar</SelectItem>
                    <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={form.timeZone} onValueChange={(v) => setForm({ ...form, timeZone: v ?? "Africa/Harare" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Time zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Africa/Harare">Africa/Harare</SelectItem>
                    <SelectItem value="Africa/Johannesburg">Africa/Johannesburg</SelectItem>
                    <SelectItem value="Africa/Lusaka">Africa/Lusaka</SelectItem>
                    <SelectItem value="Africa/Maputo">Africa/Maputo</SelectItem>
                    <SelectItem value="Europe/London">Europe/London</SelectItem>
                  </SelectContent>
                </Select>
              </Section>

              <Section label="Notes">
                <Textarea
                  placeholder="Additional notes..."
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </Section>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
        <DataTable
          columns={columns}
          fetchUrl="/api/admin/clients"
          searchPlaceholder="Search clients..."
          onRowClick={(row) => router.push(`/admin/clients/${row.id}`)}
        />
      </Suspense>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}
