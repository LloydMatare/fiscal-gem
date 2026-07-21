"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function CreateDeviceButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    serialNumber: "",
    deviceModelName: "",
    deviceModelVersion: "",
    commonName: "",
  });

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/device`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Device registered");
      setOpen(false);
      setForm({ serialNumber: "", deviceModelName: "", deviceModelVersion: "", commonName: "" });
      router.refresh();
    } catch {
      toast.error("Failed to register device");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" /> Register Device
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Register Device</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <Input placeholder="Serial number" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
          <Input placeholder="Model name" value={form.deviceModelName} onChange={(e) => setForm({ ...form, deviceModelName: e.target.value })} />
          <Input placeholder="Model version" value={form.deviceModelVersion} onChange={(e) => setForm({ ...form, deviceModelVersion: e.target.value })} />
          <Input placeholder="Common name" value={form.commonName} onChange={(e) => setForm({ ...form, commonName: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Registering..." : "Register"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
