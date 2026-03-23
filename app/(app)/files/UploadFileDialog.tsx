"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UploadCloud } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type DeviceOption = {
  id: string;
  deviceId: number | null;
  serialNumber: string | null;
};

const fileTypeOptions = [
  { label: "Offline Receipts", value: "RECEIPTS" },
  { label: "Fiscal Day Counters", value: "FISCALDAYCOUNTERS" },
];

export function UploadFileDialog({ devices }: { devices: DeviceOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deviceId, setDeviceId] = useState(devices[0]?.id ?? "");
  const [fileType, setFileType] = useState(fileTypeOptions[0].value);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    if (!deviceId) {
      toast.error("Select a device to upload the file.");
      return;
    }

    if (!file) {
      toast.error("Choose a JSON file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("deviceId", deviceId);
    formData.append("fileType", fileType);
    formData.append("file", file);

    startTransition(async () => {
      const response = await fetch("/api/fdms/files", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data?.error || "Failed to upload file.");
        return;
      }

      toast.success("File uploaded successfully.");
      setOpen(false);
      router.refresh();
      form.reset();
    });
  }

  const hasDevices = devices.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          disabled={!hasDevices}
          className="rounded-full bg-[#1e1a17] px-6 py-2.5 text-sm font-bold text-[#f6f2ea] hover:bg-black transition-all shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Upload file
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl border border-[#1e1a17]/10 bg-white/95 p-6 text-[#1e1a17] shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-black">Upload FDMS File</DialogTitle>
          <DialogDescription className="text-xs text-[#6a5f57]">
            Upload batch files for your selected device.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!hasDevices && (
            <p className="rounded-2xl border border-[#1e1a17]/10 bg-[#f6f2ea]/60 p-4 text-xs font-semibold text-[#6a5f57]">
              Register a device before uploading files.
            </p>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#6a5f57] opacity-60">
              Device
            </label>
            <select
              value={deviceId}
              onChange={(event) => setDeviceId(event.target.value)}
              disabled={!hasDevices}
              className="w-full rounded-2xl border border-[#1e1a17]/10 bg-[#f6f2ea]/40 px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#fbbf24] outline-none transition-all disabled:opacity-60"
            >
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.serialNumber || "Device"} {device.deviceId ? `• ${device.deviceId}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#6a5f57] opacity-60">
              File type
            </label>
            <select
              value={fileType}
              onChange={(event) => setFileType(event.target.value)}
              className="w-full rounded-2xl border border-[#1e1a17]/10 bg-[#f6f2ea]/40 px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#fbbf24] outline-none transition-all"
            >
              {fileTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#6a5f57] opacity-60">
              JSON file
            </label>
            <input
              name="file"
              type="file"
              accept="application/json"
              className="w-full rounded-2xl border border-[#1e1a17]/10 bg-white px-4 py-3 text-xs font-semibold text-[#1e1a17] file:mr-3 file:rounded-full file:border-0 file:bg-[#1e1a17] file:px-4 file:py-2 file:text-xs file:font-bold file:text-[#f6f2ea]"
            />
          </div>
          <DialogFooter className="pt-2">
            <button
              type="submit"
              disabled={isPending || !hasDevices}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#fbbf24] px-5 py-3 text-xs font-black text-[#1e1a17] transition-all hover:bg-[#f59e0b] disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {isPending ? "Uploading..." : "Upload file"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
