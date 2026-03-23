"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitReceiptAction } from "@/lib/actions/receipts";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Loader2, 
  Plus, 
  Trash2, 
  Receipt as ReceiptIcon,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";

interface Device {
  id: string;
  serialNumber: string | null;
  currentDayStatus: string;
}

interface NewReceiptFormProps {
  devices: Device[];
}

export default function NewReceiptForm({ devices }: NewReceiptFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState(devices[0]?.id || "");
  const [items, setItems] = useState([
    { description: "", quantity: 1, price: 0, taxCode: "A" }
  ]);

  const activeDevices = devices.filter(d => d.currentDayStatus === 'open');

  function addItem() {
    setItems([...items, { description: "", quantity: 1, price: 0, taxCode: "A" }]);
  }

  function removeItem(index: number) {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: string, value: any) {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  }

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalTax = Math.round(subtotal * 0.15); // Simplified 15% tax
  const total = subtotal + totalTax;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDeviceId) {
      toast.error("Please select a device with an open fiscal day.");
      return;
    }

    setLoading(true);
    try {
      const result = await submitReceiptAction({
        deviceId: selectedDeviceId,
        receiptType: "FISCALINVOICE",
        receiptCurrency: "ZWL",
        items: items,
      });

      if (result.success) {
        toast.success("Receipt submitted successfully!");
        router.push("/receipts");
      } else {
        toast.error(result.error || "Failed to submit receipt");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (activeDevices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="rounded-full bg-red-50 p-4">
          <ReceiptIcon className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold">No Open Fiscal Days</h2>
          <p className="max-w-xs text-sm text-[#6a5f57] mx-auto">
            You must open a fiscal day for at least one device before you can create receipts.
          </p>
        </div>
        <Link 
          href="/devices"
          className="rounded-full bg-[#1e1a17] px-6 py-2 text-sm font-semibold text-white hover:bg-black transition-colors"
        >
          Go to Devices
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          href="/receipts"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#1e1a17]/10 bg-white/80 transition-colors hover:bg-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Fiscal Receipt</h1>
          <p className="text-sm text-[#6a5f57]">Generate a signed invoice for ZIMRA monitoring.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6 pb-20">
        {/* Device Selection */}
        <div className="rounded-3xl border border-[#1e1a17]/10 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
          <label className="text-sm font-semibold text-[#1e1a17] mb-3 block">
            Select Active Device
          </label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeDevices.map((device) => (
              <button
                key={device.id}
                type="button"
                onClick={() => setSelectedDeviceId(device.id)}
                className={`flex flex-col items-start rounded-2xl border p-4 transition-all text-left
                  ${selectedDeviceId === device.id 
                    ? 'border-[#fbbf24] bg-[#fbbf24]/5 ring-1 ring-[#fbbf24]' 
                    : 'border-[#1e1a17]/10 bg-white hover:border-[#1e1a17]/20'}`}
              >
                <div className="flex w-full items-center justify-between mb-1">
                  <span className="text-sm font-bold truncate">{device.serialNumber}</span>
                  {selectedDeviceId === device.id && <CheckCircle2 className="h-4 w-4 text-[#fbbf24]" />}
                </div>
                <span className="text-[10px] text-[#6a5f57] font-medium uppercase tracking-wider">Device ID {device.id.substring(0,8)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Line Items */}
        <div className="rounded-3xl border border-[#1e1a17]/10 bg-white/80 p-6 shadow-sm backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-[#1e1a17]">Transaction Items</h3>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 text-xs font-bold text-[#d97706] hover:text-[#b45309] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Line Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="group flex flex-wrap items-end gap-3 rounded-2xl border border-[#1e1a17]/5 bg-[#f6f2ea]/30 p-4">
                <div className="flex-1 min-w-[200px] space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-[#6a5f57] ml-1">Description</label>
                  <input
                    type="text"
                    value={item.description}
                    required
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    placeholder="e.g. Consultation Fee"
                    className="w-full rounded-xl border border-[#1e1a17]/10 bg-white px-3 py-2 text-sm focus:border-[#d97706] focus:outline-none"
                  />
                </div>
                <div className="w-20 space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-[#6a5f57] ml-1">Qty</label>
                  <input
                    type="number"
                    value={item.quantity}
                    required
                    min={1}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                    className="w-full rounded-xl border border-[#1e1a17]/10 bg-white px-3 py-2 text-sm focus:border-[#d97706] focus:outline-none"
                  />
                </div>
                <div className="w-32 space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-[#6a5f57] ml-1">Price (Cents)</label>
                  <input
                    type="number"
                    value={item.price}
                    required
                    onChange={(e) => updateItem(index, 'price', parseInt(e.target.value))}
                    className="w-full rounded-xl border border-[#1e1a17]/10 bg-white px-3 py-2 text-sm focus:border-[#d97706] focus:outline-none"
                  />
                </div>
                <div className="w-20 space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-[#6a5f57] ml-1">Tax</label>
                  <select
                    value={item.taxCode}
                    onChange={(e) => updateItem(index, 'taxCode', e.target.value)}
                    className="w-full rounded-xl border border-[#1e1a17]/10 bg-white px-3 py-2 text-sm focus:border-[#d97706] focus:outline-none"
                  >
                    <option value="A">A (15%)</option>
                    <option value="B">B (0%)</option>
                    <option value="C">C (Exempt)</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="mb-1 p-2 text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Summary & Submit */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 rounded-3xl border border-[#1e1a17]/10 bg-[#1e1a17] p-6 text-white shadow-sm space-y-4">
            <h3 className="text-lg font-bold">Summary</h3>
            <div className="space-y-2 opacity-80 text-sm">
              <div className="flex justify-between">
                <span>Subtotal (ZWL)</span>
                <span>{(subtotal / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Tax (15%)</span>
                <span>{(totalTax / 100).toFixed(2)}</span>
              </div>
            </div>
            <div className="border-t border-white/10 pt-4 flex justify-between items-baseline">
              <span className="font-bold">Total Amount</span>
              <span className="text-2xl font-black">ZWL {(total / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="w-full md:w-72 flex flex-col justify-end">
            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#fbbf24] py-4 text-sm font-bold text-[#1e1a17] shadow-lg transition-all hover:bg-[#f59e0b] hover:shadow-xl disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Fiscal Sig...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 transition-transform group-hover:scale-110" />
                  Submit to ZIMRA
                </>
              )}
            </button>
            <p className="mt-4 text-[10px] text-center text-[#6a5f57] font-medium">
              Receipts are signed in real-time. This action cannot be undone.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

// Simple Save Icon for missing import
function Save({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}
