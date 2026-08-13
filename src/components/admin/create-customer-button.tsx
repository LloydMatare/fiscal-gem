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
import { Plus } from "lucide-react";

const EMPTY_FORM = {
  name: "",
  tradeName: "",
  tin: "",
  vatNumber: "",
  phone: "",
  email: "",
  province: "",
  city: "",
  street: "",
  houseNo: "",
  district: "",
  notes: "",
};

export function CreateCustomerButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const handleCreate = async () => {
    if (!form.name) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Customer created");
      setOpen(false);
      setForm(EMPTY_FORM);
      router.refresh();
    } catch {
      toast.error("Failed to create customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" /> Create Customer
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Create Customer</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2 max-h-[70vh] overflow-y-auto">
          <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Trade name" value={form.tradeName} onChange={(e) => setForm({ ...form, tradeName: e.target.value })} />
            <Input placeholder="TIN" value={form.tin} onChange={(e) => setForm({ ...form, tin: e.target.value })} />
            <Input placeholder="VAT number" value={form.vatNumber} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })} />
            <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Province" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
            <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input placeholder="Street" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
            <Input placeholder="House no" value={form.houseNo} onChange={(e) => setForm({ ...form, houseNo: e.target.value })} />
            <Input placeholder="District" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
            <Input placeholder="Notes" className="md:col-span-2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
