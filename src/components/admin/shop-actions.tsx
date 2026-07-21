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
import { Pencil, Trash2 } from "lucide-react";

interface ShopData {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  clientId: string;
}

export function ShopActions({ shop }: { shop: ShopData }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: shop.name,
    city: shop.city ?? "",
    address: shop.address ?? "",
    contactPerson: shop.contactPerson ?? "",
    contactPhone: shop.contactPhone ?? "",
  });

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${shop.clientId}/shops/${shop.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Shop updated");
      setEditOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to update shop");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${shop.clientId}/shops/${shop.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Shop deleted");
      router.push(`/admin/clients/${shop.clientId}/shops`);
    } catch {
      toast.error("Failed to delete shop");
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Shop</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Shop name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Input placeholder="Contact person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
            <Input placeholder="Contact phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Shop</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <strong>{shop.name}</strong> and all associated agents?
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
