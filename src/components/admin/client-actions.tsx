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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

interface ClientData {
  id: string;
  name: string;
  taxId: string | null;
  registrationNumber: string | null;
  lineOfBusiness: string | null;
  industryCode: string | null;
  licenseNumber: string | null;
  internalReferenceCode: string | null;
  currency: string | null;
  timeZone: string | null;
  notes: string | null;
  zimraDeviceId: number | null;
  status: string;
}

export function ClientActions({ client }: { client: ClientData }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: client.name,
    taxId: client.taxId ?? "",
    registrationNumber: client.registrationNumber ?? "",
    lineOfBusiness: client.lineOfBusiness ?? "",
    industryCode: client.industryCode ?? "",
    licenseNumber: client.licenseNumber ?? "",
    internalReferenceCode: client.internalReferenceCode ?? "",
    currency: client.currency ?? "USD",
    timeZone: client.timeZone ?? "Africa/Harare",
    notes: client.notes ?? "",
    zimraDeviceId: client.zimraDeviceId?.toString() ?? "",
  });

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const body = { ...form, zimraDeviceId: form.zimraDeviceId ? Number(form.zimraDeviceId) : undefined };
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Client updated");
      setEditOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to update client");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Client deleted");
      router.push("/admin/clients");
    } catch {
      toast.error("Failed to delete client");
    } finally {
      setSaving(false);
      setDeleteOpen(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Pencil className="h-4 w-4 mr-1" /> Edit
      </Button>
      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setDeleteOpen(true)}>
        <Trash2 className="h-4 w-4 mr-1" /> Delete
      </Button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Section label="Business Information">
              <Input placeholder="Business name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Line of business" value={form.lineOfBusiness} onChange={(e) => setForm({ ...form, lineOfBusiness: e.target.value })} />
              <Input placeholder="Industry code" value={form.industryCode} onChange={(e) => setForm({ ...form, industryCode: e.target.value })} />
            </Section>
            <Section label="Tax & Registration">
              <Input placeholder="Tax ID" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
              <Input placeholder="Registration number" value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} />
              <Input placeholder="License number" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} />
              <Input placeholder="Internal reference code" value={form.internalReferenceCode} onChange={(e) => setForm({ ...form, internalReferenceCode: e.target.value })} />
            </Section>
            <Section label="ZIMRA Device">
              <Input placeholder="ZIMRA device ID" type="number" value={form.zimraDeviceId} onChange={(e) => setForm({ ...form, zimraDeviceId: e.target.value })} />
            </Section>
            <Section label="Regional Settings">
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v ?? "USD" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="ZWL">ZWL</SelectItem>
                  <SelectItem value="ZAR">ZAR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.timeZone} onValueChange={(v) => setForm({ ...form, timeZone: v ?? "Africa/Harare" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa/Harare">Africa/Harare</SelectItem>
                  <SelectItem value="Africa/Johannesburg">Africa/Johannesburg</SelectItem>
                  <SelectItem value="Europe/London">Europe/London</SelectItem>
                </SelectContent>
              </Select>
            </Section>
            <Section label="Notes">
              <Textarea placeholder="Notes..." rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Section>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{client.name}</strong>? This will soft-delete the client and all associated data.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>{saving ? "Deleting..." : "Delete"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
