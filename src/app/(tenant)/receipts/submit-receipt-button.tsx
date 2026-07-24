"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

interface ReceiptLine {
  articleName: string;
  articleCode: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

interface ReceiptPayment {
  paymentType: string;
  paymentAmount: number;
}

export function SubmitReceiptButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fiscalDayStatus, setFiscalDayStatus] = useState<{ hasFiscalDay: boolean; fiscalDayNo?: number } | null>(null);

  const [form, setForm] = useState({
    shopId: "",
    deviceId: "",
    externalReference: "",
    receiptNumber: "",
    invoiceNo: "",
    receiptType: "FiscalInvoice",
    currency: "USD",
    operatorId: "",
    buyerName: "",
    buyerTradeName: "",
    buyerTIN: "",
    buyerVATNumber: "",
    buyerPhone: "",
    buyerEmail: "",
    buyerProvince: "",
    buyerCity: "",
    buyerStreet: "",
    buyerHouseNo: "",
    buyerDistrict: "",
    receiptNotes: "",
  });

  const [lines, setLines] = useState<ReceiptLine[]>([
    { articleName: "", articleCode: "", quantity: 1, unitPrice: 0, taxRate: 15 },
  ]);

  const [payments, setPayments] = useState<ReceiptPayment[]>([
    { paymentType: "Cash", paymentAmount: 0 },
  ]);

  useEffect(() => {
    if (open) {
      // Fetch shop, device, and fiscal day status
      Promise.all([
        fetch("/api/tenant/shops?limit=1").then((r) => r.json()),
        fetch("/api/tenant/devices?limit=1").then((r) => r.json()),
      ])
        .then(([shopRes, deviceRes]) => {
          const shop = shopRes.data?.[0];
          const device = deviceRes.data?.[0];

          setForm((prev) => ({
            ...prev,
            shopId: shop?.id || "",
            deviceId: device?.deviceId ? String(device.deviceId) : "",
          }));

          // Check fiscal day status
          if (device?.deviceId) {
            fetch(`/api/tenant/device-status?deviceId=${device.deviceId}`)
              .then((r) => r.json())
              .then((data) => {
                setFiscalDayStatus({
                  hasFiscalDay: !!data.fiscalDay,
                  fiscalDayNo: data.fiscalDay?.fiscalDayNo,
                });
              })
              .catch(() => setFiscalDayStatus({ hasFiscalDay: false }));
          }
        })
        .catch(() => {});
    }
  }, [open]);

  const totalAmount = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const totalTax = lines.reduce(
    (sum, l) =>
      sum + (l.taxRate > 0 ? (l.quantity * l.unitPrice * l.taxRate) / (100 + l.taxRate) : 0),
    0
  );

  const handleSubmit = async () => {
    setError(null);

    if (fiscalDayStatus && !fiscalDayStatus.hasFiscalDay) {
      setError("No open fiscal day. Open a fiscal day first from the Devices page.");
      return;
    }

    setLoading(true);
    try {
      const receiptLines = lines.map((l, i) => ({
        receiptLineType: "Sale",
        receiptLineNo: i + 1,
        receiptLineHSCode: l.articleCode || "00000000",
        receiptLineName: l.articleName,
        receiptLinePrice: l.unitPrice,
        receiptLineQuantity: l.quantity,
        receiptLineTotal: Number((l.quantity * l.unitPrice).toFixed(2)),
        taxPercent: l.taxRate,
      }));

      const receiptTaxes: { taxPercent: number; taxAmount: number; salesAmountWithTax: number }[] = [];
      for (const l of lines) {
        const existing = receiptTaxes.find((t) => t.taxPercent === l.taxRate);
        const lineTotal = l.quantity * l.unitPrice;
        const taxAmt = l.taxRate > 0 ? Number((lineTotal * l.taxRate / (100 + l.taxRate)).toFixed(2)) : 0;
        if (existing) {
          existing.taxAmount = Number((existing.taxAmount + taxAmt).toFixed(2));
          existing.salesAmountWithTax = Number((existing.salesAmountWithTax + lineTotal).toFixed(2));
        } else {
          receiptTaxes.push({
            taxPercent: l.taxRate,
            taxAmount: taxAmt,
            salesAmountWithTax: lineTotal,
          });
        }
      }

      const receiptTotal = Number(totalAmount.toFixed(2));
      const receiptPayments = payments.map((p) => ({
        moneyTypeCode: p.paymentType,
        paymentAmount: p.paymentType === "Cash" ? receiptTotal : p.paymentAmount,
      }));

      const now = new Date().toISOString();

      const fiscalPayload = {
        receipt: {
          receiptType: form.receiptType,
          receiptCurrency: form.currency,
          invoiceNo: form.invoiceNo || `INV-${Date.now()}`,
          buyerData: {
            buyerRegisterName: form.buyerName || undefined,
            buyerTradeName: form.buyerTradeName || undefined,
            VATNumber: form.buyerVATNumber || undefined,
            buyerTIN: form.buyerTIN || undefined,
            buyerContacts: {
              phoneNo: form.buyerPhone || undefined,
              email: form.buyerEmail || undefined,
            },
            buyerAddress: {
              province: form.buyerProvince || undefined,
              city: form.buyerCity || undefined,
              street: form.buyerStreet || undefined,
              houseNo: form.buyerHouseNo || undefined,
              district: form.buyerDistrict || undefined,
            },
          },
          receiptNotes: form.receiptNotes || undefined,
          receiptDate: now,
          receiptLinesTaxInclusive: true,
          receiptLines,
          receiptTaxes,
          receiptPayments,
          receiptTotal,
          receiptPrintForm: "Receipt48",
        },
      };

      const body: Record<string, unknown> = {
        externalReference: form.externalReference || `EXT-${Date.now()}`,
        fiscalPayload,
      };
      if (form.shopId) body.shopId = form.shopId;
      if (form.deviceId) body.deviceId = Number(form.deviceId);
      if (form.receiptNumber) body.receiptNumber = form.receiptNumber;

      const res = await fetch("/api/tenant/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to submit receipt");

      setOpen(false);
      setForm({
        shopId: "", deviceId: "", externalReference: "", receiptNumber: "",
        invoiceNo: "", receiptType: "FiscalInvoice", currency: "USD", operatorId: "",
        buyerName: "", buyerTradeName: "", buyerTIN: "", buyerVATNumber: "",
        buyerPhone: "", buyerEmail: "", buyerProvince: "", buyerCity: "",
        buyerStreet: "", buyerHouseNo: "", buyerDistrict: "", receiptNotes: "",
      });
      setLines([{ articleName: "", articleCode: "", quantity: 1, unitPrice: 0, taxRate: 15 }]);
      setPayments([{ paymentType: "Cash", paymentAmount: 0 }]);
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Failed to submit receipt");
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
            {/* Shop & Device - Auto-populated from client */}
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Shop</label>
                <div className="flex h-9 w-full rounded-md border border-input bg-muted/50 px-3 text-sm items-center">
                  {form.shopId ? "Auto-populated from client" : "No shop configured"}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Device</label>
                <div className="flex h-9 w-full rounded-md border border-input bg-muted/50 px-3 text-sm items-center">
                  {form.deviceId ? `Device ${form.deviceId}` : "No device configured"}
                </div>
              </div>
            </div>

            {/* Fiscal Day Status Warning */}
            {fiscalDayStatus && !fiscalDayStatus.hasFiscalDay && (
              <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                <strong>No open fiscal day.</strong> You must open a fiscal day before submitting receipts. Go to Devices page to open one.
              </div>
            )}
            {fiscalDayStatus?.hasFiscalDay && (
              <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
                Fiscal Day #{fiscalDayStatus.fiscalDayNo} is open.
              </div>
            )}

            {/* Receipt Header */}
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Invoice No</label>
                <Input placeholder="INV-001" value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Receipt Type</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={form.receiptType}
                  onChange={(e) => setForm({ ...form, receiptType: e.target.value })}
                >
                  <option value="FiscalInvoice">Fiscal Invoice</option>
                  <option value="CreditNote">Credit Note</option>
                  <option value="DebitNote">Debit Note</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Currency</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  <option value="USD">USD</option>
                  <option value="ZWL">ZWL</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">External Reference</label>
                <Input placeholder="Auto-generated if empty" value={form.externalReference} onChange={(e) => setForm({ ...form, externalReference: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Receipt Number</label>
                <Input placeholder="Optional" value={form.receiptNumber} onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })} />
              </div>
            </div>

            {/* Buyer */}
            <div className="border-t pt-3">
              <h4 className="text-sm font-semibold mb-2">Buyer Information</h4>
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Buyer Name" value={form.buyerName} onChange={(e) => setForm({ ...form, buyerName: e.target.value })} />
                <Input placeholder="Trade Name" value={form.buyerTradeName} onChange={(e) => setForm({ ...form, buyerTradeName: e.target.value })} />
                <Input placeholder="TIN" value={form.buyerTIN} onChange={(e) => setForm({ ...form, buyerTIN: e.target.value })} />
                <Input placeholder="VAT Number" value={form.buyerVATNumber} onChange={(e) => setForm({ ...form, buyerVATNumber: e.target.value })} />
                <Input placeholder="Phone" value={form.buyerPhone} onChange={(e) => setForm({ ...form, buyerPhone: e.target.value })} />
                <Input placeholder="Email" value={form.buyerEmail} onChange={(e) => setForm({ ...form, buyerEmail: e.target.value })} />
                <Input placeholder="Province" value={form.buyerProvince} onChange={(e) => setForm({ ...form, buyerProvince: e.target.value })} />
                <Input placeholder="City" value={form.buyerCity} onChange={(e) => setForm({ ...form, buyerCity: e.target.value })} />
                <Input placeholder="Street" value={form.buyerStreet} onChange={(e) => setForm({ ...form, buyerStreet: e.target.value })} />
                <Input placeholder="House No" value={form.buyerHouseNo} onChange={(e) => setForm({ ...form, buyerHouseNo: e.target.value })} />
                <Input placeholder="District" className="md:col-span-2" value={form.buyerDistrict} onChange={(e) => setForm({ ...form, buyerDistrict: e.target.value })} />
              </div>
            </div>

            {/* Lines */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Receipt Lines</h4>
                <Button variant="ghost" size="sm" onClick={() => setLines([...lines, { articleName: "", articleCode: "", quantity: 1, unitPrice: 0, taxRate: 15 }])}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
                </Button>
              </div>
              <div className="space-y-2">
                {lines.map((line, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <Input placeholder="Article" className="flex-1" value={line.articleName} onChange={(e) => { const next = [...lines]; next[i].articleName = e.target.value; setLines(next); }} />
                    <Input placeholder="HS Code" className="w-20" value={line.articleCode} onChange={(e) => { const next = [...lines]; next[i].articleCode = e.target.value; setLines(next); }} />
                    <Input type="number" placeholder="Qty" className="w-16" value={line.quantity} onChange={(e) => { const next = [...lines]; next[i].quantity = Number(e.target.value); setLines(next); }} />
                    <Input type="number" placeholder="Price" className="w-24" value={line.unitPrice || ""} onChange={(e) => { const next = [...lines]; next[i].unitPrice = Number(e.target.value); setLines(next); }} />
                    <Input type="number" placeholder="Tax%" className="w-16" value={line.taxRate} onChange={(e) => { const next = [...lines]; next[i].taxRate = Number(e.target.value); setLines(next); }} />
                    {lines.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => setLines(lines.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Payments */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Payments</h4>
                <Button variant="ghost" size="sm" onClick={() => setPayments([...payments, { paymentType: "Cash", paymentAmount: 0 }])}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Payment
                </Button>
              </div>
              <div className="space-y-2">
                {payments.map((pmt, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <select
                      className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                      value={pmt.paymentType}
                      onChange={(e) => { const next = [...payments]; next[i].paymentType = e.target.value; setPayments(next); }}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="BankTransfer">Bank Transfer</option>
                      <option value="MobileMoney">Mobile Money</option>
                      <option value="Credit">Credit</option>
                    </select>
                    <Input
                      type="number"
                      placeholder="Amount"
                      className="w-32"
                      value={pmt.paymentType === "Cash" ? totalAmount.toFixed(2) : pmt.paymentAmount || ""}
                      readOnly={pmt.paymentType === "Cash"}
                      onChange={(e) => { const next = [...payments]; next[i].paymentAmount = Number(e.target.value); setPayments(next); }}
                    />
                    {payments.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => setPayments(payments.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="border-t pt-3">
              <Input placeholder="Receipt notes (optional)" value={form.receiptNotes} onChange={(e) => setForm({ ...form, receiptNotes: e.target.value })} />
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
                <span className="font-bold">{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
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
