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

interface DeviceData {
  id: string;
  deviceId: number | null;
  serialNumber: string | null;
  deviceModelName: string | null;
  deviceModelVersion: string | null;
  commonName: string | null;
  activated: boolean | null;
  clientId: string;
}

export function DeviceActions({ device }: { device: DeviceData }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    serialNumber: device.serialNumber ?? "",
    deviceModelName: device.deviceModelName ?? "",
    deviceModelVersion: device.deviceModelVersion ?? "",
    commonName: device.commonName ?? "",
  });

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${device.clientId}/device`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: device.id, ...form }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Device updated");
      setEditOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to update device");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${device.clientId}/device?deviceId=${device.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Device deleted");
      router.push(`/admin/clients/${device.clientId}/devices`);
    } catch {
      toast.error("Failed to delete device");
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
          <DialogHeader><DialogTitle>Edit Device</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Serial number" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
            <Input placeholder="Model name" value={form.deviceModelName} onChange={(e) => setForm({ ...form, deviceModelName: e.target.value })} />
            <Input placeholder="Model version" value={form.deviceModelVersion} onChange={(e) => setForm({ ...form, deviceModelVersion: e.target.value })} />
            <Input placeholder="Common name" value={form.commonName} onChange={(e) => setForm({ ...form, commonName: e.target.value })} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Device</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete device <strong>{device.deviceId ?? device.id}</strong>?
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
