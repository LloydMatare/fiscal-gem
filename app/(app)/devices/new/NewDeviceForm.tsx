"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerDeviceAction } from "@/lib/actions/devices";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";

export default function NewDeviceForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      deviceId: formData.get("deviceId") as string,
      serialNumber: formData.get("serialNumber") as string,
      activationKey: formData.get("activationKey") as string,
    };

    try {
      const result = await registerDeviceAction(data);
      if (result.success) {
        toast.success("Device registered successfully!");
        router.push("/devices");
      } else {
        toast.error(result.error || "Failed to register device");
      }
    } catch (error) {
      toast.error("You do not have permission to register devices.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          href="/devices"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#1e1a17]/10 bg-white/80 transition-colors hover:bg-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Register New Device</h1>
          <p className="text-sm text-[#6a5f57]">Link your ZIMRA fiscal device to your organization.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="rounded-3xl border border-[#1e1a17]/10 bg-white/80 p-8 shadow-sm backdrop-blur-sm space-y-6">
        <div className="grid gap-6">
          <div className="space-y-2">
            <label htmlFor="deviceId" className="text-sm font-medium text-[#1e1a17]">
              ZIMRA Device ID
            </label>
            <input
              id="deviceId"
              name="deviceId"
              type="number"
              required
              placeholder="e.g. 30712"
              className="flex h-12 w-full rounded-2xl border border-[#1e1a17]/10 bg-[#f6f2ea]/50 px-4 py-2 text-sm transition-colors focus:border-[#d97706] focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="serialNumber" className="text-sm font-medium text-[#1e1a17]">
              Device Serial Number
            </label>
            <input
              id="serialNumber"
              name="serialNumber"
              type="text"
              required
              placeholder="e.g. chiwox-1"
              className="flex h-12 w-full rounded-2xl border border-[#1e1a17]/10 bg-[#f6f2ea]/50 px-4 py-2 text-sm transition-colors focus:border-[#d97706] focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="activationKey" className="text-sm font-medium text-[#1e1a17]">
              Activation Key
            </label>
            <input
              id="activationKey"
              name="activationKey"
              type="text"
              required
              placeholder="8-character code from ZIMRA portal"
              className="flex h-12 w-full rounded-2xl border border-[#1e1a17]/10 bg-[#f6f2ea]/50 px-4 py-2 text-sm transition-colors focus:border-[#d97706] focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#fbbf24] py-3 text-sm font-bold text-[#1e1a17] transition-all hover:bg-[#f59e0b] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Complete Registration
              </>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-[#6a5f57]">
          By registering, you authorize FiscalGem to securely store your device credentials 
          and communicate with ZIMRA on your behalf.
        </p>
      </form>
    </div>
  );
}
