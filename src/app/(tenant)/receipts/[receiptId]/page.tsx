import { resolveClient } from "@/lib/tenant";
import { OrgNotConfigured } from "@/components/layout/org-not-configured";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { receipts, devices } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { PageHeader } from "@/components/layout/page-header";
import { ReceiptStatusBadge } from "@/components/status-badge";

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ receiptId: string }>;
}) {
  const resolved = await resolveClient();
  if (!resolved) return <OrgNotConfigured />;
  const { client } = resolved;

  const { receiptId } = await params;
  const receipt = await db.query.receipts.findFirst({
    where: and(eq(receipts.id, receiptId), eq(receipts.clientId, client.id)),
  });

  if (!receipt) notFound();

  const device = receipt.deviceId
    ? await db.query.devices.findFirst({ where: eq(devices.id, receipt.deviceId) })
    : null;

  let fiscalPayload: any = {};
  try { fiscalPayload = JSON.parse(receipt.fiscalPayloadJson || "{}"); } catch {}
  const receiptData = fiscalPayload?.receipt || {};

  let fdmsResponse: any = null;
  try { fdmsResponse = JSON.parse(receipt.fdmsResponseJson || "null"); } catch {}

  const lines = receiptData.receiptLines || [];
  const taxes = receiptData.receiptTaxes || receiptData.taxes || [];
  const payments = receiptData.receiptPayments || receiptData.payments || [];
  const buyer = receiptData.buyerData || receiptData.buyer || null;

  return (
    <div>
      <PageHeader
        title={`Receipt #${receipt.receiptGlobalNo || "—"}`}
        description={receipt.invoiceNo || receipt.externalReference}
        breadcrumbs={[
          { label: "Receipts", href: "/receipts" },
          { label: `#${receipt.receiptGlobalNo}`, href: "#" },
        ]}
      >
        <ReceiptStatusBadge status={receipt.status} />
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-md border p-6">
          <h2 className="text-lg font-semibold mb-4">Receipt Info</h2>
          <div className="space-y-3">
            <InfoRow label="Status" value={receipt.status} />
            <InfoRow label="Invoice No" value={receipt.invoiceNo} />
            <InfoRow label="Receipt Type" value={receipt.receiptType} />
            <InfoRow label="Global No" value={receipt.receiptGlobalNo?.toString()} />
            <InfoRow label="Counter" value={receipt.receiptCounter?.toString()} />
            <InfoRow label="External Reference" value={receipt.externalReference} />
            <InfoRow label="Fiscal Day No" value={receipt.fiscalDayNo?.toString()} />
            <InfoRow label="Device" value={device?.deviceId?.toString()} />
            <InfoRow label="Currency" value={receiptData.receiptCurrency} />
            <InfoRow label="Total" value={receiptData.receiptTotal ? `$${Number(receiptData.receiptTotal).toFixed(2)}` : undefined} />
            <InfoRow label="Received At" value={receipt.receivedAt?.toLocaleString()} />
            <InfoRow label="Fiscalised At" value={receipt.fiscalisedAt?.toLocaleString()} />
          </div>
        </div>

        <div className="rounded-md border p-6">
          <h2 className="text-lg font-semibold mb-4">FDMS Response</h2>
          {receipt.fdmsOperationId || receipt.fdmsReceiptId ? (
            <div className="space-y-3">
              <InfoRow label="Operation ID" value={receipt.fdmsOperationId} />
              <InfoRow label="FDMS Receipt ID" value={receipt.fdmsReceiptId?.toString()} />
              <InfoRow label="Signature Hash" value={receipt.fdmsServerSignatureHash?.substring(0, 32) + "..."} />
              <InfoRow label="Thumbprint" value={receipt.fdmsServerSignatureThumbprint} />
            </div>
          ) : fdmsResponse ? (
            <div className="space-y-3">
              <InfoRow label="Operation ID" value={fdmsResponse.operationID || fdmsResponse.OperationId} />
              <InfoRow label="FDMS Receipt ID" value={(fdmsResponse.receiptID || fdmsResponse.ReceiptId)?.toString()} />
              <InfoRow label="Signature Hash" value={fdmsResponse.receiptServerSignature?.hash || fdmsResponse.SignatureHash} />
              <InfoRow label="Thumbprint" value={fdmsResponse.receiptServerSignature?.certificateThumbprint || fdmsResponse.SignatureThumbprint} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No FDMS response yet</p>
          )}
          {fdmsResponse?.validationErrors?.length > 0 && (
            <div className="mt-4 space-y-2">
              {fdmsResponse.validationErrors.map((err: any, i: number) => (
                <div
                  key={i}
                  className={`rounded-md p-3 ${
                    err.validationErrorColor === "Red"
                      ? "bg-red-50 border border-red-200"
                      : "bg-yellow-50 border border-yellow-200"
                  }`}
                >
                  <p className={`text-sm font-medium ${
                    err.validationErrorColor === "Red" ? "text-red-800" : "text-yellow-800"
                  }`}>
                    {err.validationErrorCode}: {err.validationErrorDescription}
                  </p>
                </div>
              ))}
            </div>
          )}
          {receipt.errorCode && (
            <div className="mt-4 rounded-md bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">Error: {receipt.errorCode}</p>
              {receipt.errorMessage && (
                <p className="text-sm text-red-600 mt-1">{receipt.errorMessage}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {buyer && (
        <div className="mt-6 rounded-md border p-6">
          <h2 className="text-lg font-semibold mb-4">Buyer Information</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <InfoRow label="Name" value={buyer.buyerRegisterName || buyer.name} />
            <InfoRow label="Trade Name" value={buyer.buyerTradeName} />
            <InfoRow label="TIN" value={buyer.buyerTIN || buyer.tin} />
            <InfoRow label="VAT Number" value={buyer.VATNumber || buyer.vatNumber} />
            <InfoRow label="Phone" value={buyer.buyerContacts?.phoneNo || buyer.contact} />
            <InfoRow label="Email" value={buyer.buyerContacts?.email} />
            {buyer.buyerAddress && (
              <>
                <InfoRow label="Province" value={buyer.buyerAddress.province} />
                <InfoRow label="City" value={buyer.buyerAddress.city} />
                <InfoRow label="Street" value={buyer.buyerAddress.street} />
                <InfoRow label="House No" value={buyer.buyerAddress.houseNo} />
              </>
            )}
          </div>
        </div>
      )}

      {lines.length > 0 && (
        <div className="mt-6 rounded-md border p-6">
          <h2 className="text-lg font-semibold mb-4">Line Items</h2>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">HS Code</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Qty</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Price</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Tax %</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line: any, i: number) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2 text-sm">{line.receiptLineNo || i + 1}</td>
                    <td className="px-3 py-2 text-sm">{line.receiptLineType || "Sale"}</td>
                    <td className="px-3 py-2 text-sm font-medium">{line.receiptLineName}</td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">{line.receiptLineHSCode || "—"}</td>
                    <td className="px-3 py-2 text-sm text-right">{line.receiptLineQuantity}</td>
                    <td className="px-3 py-2 text-sm text-right">${Number(line.receiptLinePrice).toFixed(2)}</td>
                    <td className="px-3 py-2 text-sm text-right">{line.taxPercent ?? line.taxRate ?? "—"}%</td>
                    <td className="px-3 py-2 text-sm text-right font-medium">${Number(line.receiptLineTotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(taxes.length > 0 || payments.length > 0) && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {taxes.length > 0 && (
            <div className="rounded-md border p-6">
              <h2 className="text-lg font-semibold mb-4">Taxes</h2>
              <div className="space-y-2">
                {taxes.map((tax: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Tax {tax.taxPercent ?? tax.taxRate}% (ID: {tax.taxID || tax.taxCode})
                    </span>
                    <span className="font-medium">${tax.taxAmount?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {payments.length > 0 && (
            <div className="rounded-md border p-6">
              <h2 className="text-lg font-semibold mb-4">Payments</h2>
              <div className="space-y-2">
                {payments.map((p: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{p.moneyTypeCode || p.paymentType}</span>
                    <span className="font-medium">${p.paymentAmount?.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm border-t pt-2 mt-2 font-semibold">
                  <span>Total</span>
                  <span>${receiptData.receiptTotal?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {receipt.fiscalPayloadJson && (
        <div className="mt-6 rounded-md border p-6">
          <h2 className="text-lg font-semibold mb-4">Fiscal Payload (Raw)</h2>
          <pre className="text-xs bg-muted p-4 rounded overflow-x-auto max-h-60">
            {JSON.stringify(JSON.parse(receipt.fiscalPayloadJson), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}
