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
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface ReceiptLine {
  articleName: string;
  articleCode?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

interface ReceiptPayment {
  paymentType: string;
  paymentAmount: number;
}

interface ReceiptTax {
  taxCode: string;
  taxRate: number;
  taxAmount: number;
}

interface SubmitReceiptButtonProps {
  clientId: string;
  deviceId: number;
  deviceModelName?: string | null;
  deviceModelVersion?: string | null;
}

export function SubmitReceiptButton({
  clientId,
  deviceId,
  deviceModelName,
  deviceModelVersion,
}: SubmitReceiptButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    invoiceNo: "",
    receiptType: "FISCALINVOICE",
    operatorId: "ADMIN",
    fiscalDayNo: "",
    buyerName: "",
    buyerTIN: "",
    buyerAddress: "",
    buyerPhone: "",
  });

  const [lines, setLines] = useState<ReceiptLine[]>([
    { articleName: "", quantity: 1, unitPrice: 0, taxRate: 15.5 },
  ]);
  const [payments, setPayments] = useState<ReceiptPayment[]>([
    { paymentType: "CASH", paymentAmount: 0 },
  ]);

  const totalAmount = lines.reduce(
    (sum, l) => sum + l.quantity * l.unitPrice,
    0
  );
  // Tax-inclusive: tax is already included in unitPrice
  const totalTax = lines.reduce(
    (sum, l) =>
      sum + (l.taxRate > 0 ? l.quantity * l.unitPrice * l.taxRate / (100 + l.taxRate) : 0),
    0
  );

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const receiptLines = lines.map((l, i) => ({
        lineNo: i + 1,
        articleName: l.articleName,
        articleCode: l.articleCode,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        totalPrice: l.quantity * l.unitPrice,
        taxRate: l.taxRate,
        taxAmount: l.quantity * l.unitPrice * (l.taxRate / 100),
      }));

      const receiptTaxes: ReceiptTax[] = [];
      for (const l of lines) {
        const existing = receiptTaxes.find((t) => t.taxRate === l.taxRate);
        const taxAmt = l.quantity * l.unitPrice * (l.taxRate / 100);
        if (existing) {
          existing.taxAmount += taxAmt;
        } else {
          receiptTaxes.push({
            taxCode: `TAX_${l.taxRate}`,
            taxRate: l.taxRate,
            taxAmount: taxAmt,
          });
        }
      }

      const receiptPayments = payments.map((p) => ({
        ...p,
        paymentAmount:
          p.paymentType === "CASH"
            ? totalAmount
            : p.paymentAmount,
      }));

      const res = await fetch(
        `/api/admin/clients/${clientId}/device/submit-receipt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceID: deviceId,
            deviceModelName: deviceModelName || "FiscalEdge",
            deviceModelVersion: deviceModelVersion || "1.0.0",
            receipt: {
              receiptType: form.receiptType,
              invoiceNo: form.invoiceNo || `INV-${Date.now()}`,
              externalReference: `EXT-${Date.now()}`,
              operatorId: form.operatorId,
              fiscalDayNo: form.fiscalDayNo ? Number(form.fiscalDayNo) : undefined,
              lines: receiptLines,
              payments: receiptPayments,
              taxes: receiptTaxes,
              buyer:
                form.buyerName || form.buyerTIN
                  ? {
                      name: form.buyerName || undefined,
                      tin: form.buyerTIN || undefined,
                      address: form.buyerAddress || undefined,
                      contact: form.buyerPhone || undefined,
                    }
                  : undefined,
            },
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit receipt");

      toast.success(
        `Receipt #${data.data?.fdmsResponse?.ReceiptGlobalNo || "?"} fiscalised`
      );
      setOpen(false);
      setLines([{ articleName: "", quantity: 1, unitPrice: 0, taxRate: 15.5 }]);
      setPayments([{ paymentType: "CASH", paymentAmount: 0 }]);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit receipt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" /> Submit Receipt
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit Fiscal Receipt</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Header */}
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="Invoice No"
                value={form.invoiceNo}
                onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
              />
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.receiptType}
                onChange={(e) =>
                  setForm({ ...form, receiptType: e.target.value })
                }
              >
                <option value="FISCALINVOICE">Fiscal Invoice</option>
                <option value="CREDITNOTE">Credit Note</option>
                <option value="DEBITNOTE">Debit Note</option>
              </select>
              <Input
                placeholder="Operator ID"
                value={form.operatorId}
                onChange={(e) =>
                  setForm({ ...form, operatorId: e.target.value })
                }
              />
            </div>

            {/* Fiscal Day + Buyer */}
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Fiscal Day No (leave blank to auto-detect)"
                type="number"
                value={form.fiscalDayNo}
                onChange={(e) =>
                  setForm({ ...form, fiscalDayNo: e.target.value })
                }
              />
              <Input
                placeholder="Buyer Name"
                value={form.buyerName}
                onChange={(e) =>
                  setForm({ ...form, buyerName: e.target.value })
                }
              />
              <Input
                placeholder="Buyer TIN"
                value={form.buyerTIN}
                onChange={(e) => setForm({ ...form, buyerTIN: e.target.value })}
              />
              <Input
                placeholder="Buyer Phone"
                value={form.buyerPhone}
                onChange={(e) =>
                  setForm({ ...form, buyerPhone: e.target.value })
                }
              />
              <Input
                placeholder="Buyer Address"
                className="md:col-span-2"
                value={form.buyerAddress}
                onChange={(e) =>
                  setForm({ ...form, buyerAddress: e.target.value })
                }
              />
            </div>

            {/* Lines */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Lines</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setLines([
                      ...lines,
                      {
                        articleName: "",
                        quantity: 1,
                        unitPrice: 0,
                        taxRate: 15.5,
                      },
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
                </Button>
              </div>
              <div className="space-y-2">
                {lines.map((line, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <Input
                      placeholder="Article"
                      className="flex-1"
                      value={line.articleName}
                      onChange={(e) => {
                        const next = [...lines];
                        next[i].articleName = e.target.value;
                        setLines(next);
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      className="w-16"
                      value={line.quantity}
                      onChange={(e) => {
                        const next = [...lines];
                        next[i].quantity = Number(e.target.value);
                        setLines(next);
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      className="w-24"
                      value={line.unitPrice || ""}
                      onChange={(e) => {
                        const next = [...lines];
                        next[i].unitPrice = Number(e.target.value);
                        setLines(next);
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Tax%"
                      className="w-16"
                      value={line.taxRate}
                      onChange={(e) => {
                        const next = [...lines];
                        next[i].taxRate = Number(e.target.value);
                        setLines(next);
                      }}
                    />
                    {lines.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLines(lines.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Payments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Payments</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setPayments([...payments, { paymentType: "CASH", paymentAmount: 0 }])
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Payment
                </Button>
              </div>
              <div className="space-y-2">
                {payments.map((pmt, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <select
                      className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                      value={pmt.paymentType}
                      onChange={(e) => {
                        const next = [...payments];
                        next[i].paymentType = e.target.value;
                        setPayments(next);
                      }}
                    >
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="MOBILE_MONEY">Mobile Money</option>
                      <option value="CREDIT">Credit</option>
                    </select>
                    <Input
                      type="number"
                      placeholder="Amount"
                      className="w-32"
                      value={
                        pmt.paymentType === "CASH"
                          ? totalAmount
                          : pmt.paymentAmount || ""
                      }
                      readOnly={pmt.paymentType === "CASH"}
                      onChange={(e) => {
                        const next = [...payments];
                        next[i].paymentAmount = Number(e.target.value);
                        setPayments(next);
                      }}
                    />
                    {payments.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setPayments(payments.filter((_, j) => j !== i))
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end gap-6 text-sm border-t pt-3">
              <div>
                <span className="text-muted-foreground">Subtotal (incl. tax): </span>
                <span className="font-medium">{totalAmount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Tax: </span>
                <span className="font-medium">{totalTax.toFixed(2)}</span>
              </div>
              <div>
                <span className="font-semibold">Total: </span>
                <span className="font-bold">
                  {totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Submitting to ZIMRA..." : "Submit Receipt"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
