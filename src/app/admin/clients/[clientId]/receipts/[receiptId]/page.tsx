import { db } from "@/db";
import { receipts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ReceiptStatusBadge } from "@/components/status-badge";
import { ReceiptDeleteButton } from "@/components/admin/receipt-delete-button";

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ clientId: string; receiptId: string }>;
}) {
  const { clientId, receiptId } = await params;

  const receipt = await db.query.receipts.findFirst({
    where: eq(receipts.id, receiptId),
  });

  if (!receipt || receipt.clientId !== clientId) notFound();

  return (
    <div>
      <PageHeader
        title={`Receipt #${receipt.receiptGlobalNo || "—"}`}
        description={receipt.externalReference}
        breadcrumbs={[
          { label: "Clients", href: "/admin/clients" },
          { label: clientId, href: `/admin/clients/${clientId}` },
          { label: "Receipts", href: `/admin/clients/${clientId}/receipts` },
          { label: `#${receipt.receiptGlobalNo}`, href: "#" },
        ]}
      >
        <div className="flex items-center gap-2">
          <ReceiptStatusBadge status={receipt.status} />
          <ReceiptDeleteButton
            receiptId={receiptId}
            clientId={clientId}
            label={`#${receipt.receiptGlobalNo}`}
          />
        </div>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-md border p-6">
          <h2 className="text-lg font-semibold mb-4">Receipt Info</h2>
          <div className="space-y-3">
            <InfoRow label="External Reference" value={receipt.externalReference} />
            <InfoRow label="Receipt Type" value={receipt.receiptType} />
            <InfoRow label="Invoice No" value={receipt.invoiceNo} />
            <InfoRow label="Receipt Number" value={receipt.receiptNumber} />
            <InfoRow label="Fiscal Day No" value={receipt.fiscalDayNo?.toString()} />
            <InfoRow label="Global No" value={receipt.receiptGlobalNo?.toString()} />
            <InfoRow label="Received At" value={receipt.receivedAt?.toLocaleString()} />
            <InfoRow label="Fiscalised At" value={receipt.fiscalisedAt?.toLocaleString()} />
          </div>
        </div>

        <div className="rounded-md border p-6">
          <h2 className="text-lg font-semibold mb-4">FDMS Response</h2>
          {receipt.fdmsResponseJson ? (
            <pre className="text-xs bg-muted p-4 rounded overflow-x-auto max-h-60">
              {JSON.stringify(JSON.parse(receipt.fdmsResponseJson), null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">No response yet</p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-md border p-6">
        <h2 className="text-lg font-semibold mb-4">Fiscal Payload</h2>
        <pre className="text-xs bg-muted p-4 rounded overflow-x-auto max-h-60">
          {JSON.stringify(JSON.parse(receipt.fiscalPayloadJson || "{}"), null, 2)}
        </pre>
      </div>
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
