import { resolveClient } from "@/lib/tenant";
import { OrgNotConfigured } from "@/components/layout/org-not-configured";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { receipts } from "@/db/schema";
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

  let signedFiscalPayload: any = null;
  if (receipt.signedPayloadJson) {
    try { signedFiscalPayload = JSON.parse(receipt.signedPayloadJson); } catch {}
  } else if (receipt.fiscalPayloadJson) {
    try { signedFiscalPayload = JSON.parse(receipt.fiscalPayloadJson); } catch {}
  }

  let fdmsResponse: any = null;
  if (receipt.fdmsResponseJson) {
    try { fdmsResponse = JSON.parse(receipt.fdmsResponseJson); } catch {}
  }

  return (
    <div>
      <PageHeader
        title={`Receipt #${receipt.receiptGlobalNo || "—"}`}
        description={receipt.externalReference}
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
            <InfoRow label="External Reference" value={receipt.externalReference} />
            <InfoRow label="Receipt Type" value={receipt.receiptType} />
            <InfoRow label="Invoice No" value={receipt.invoiceNo} />
            <InfoRow label="Receipt Number" value={receipt.receiptNumber} />
            <InfoRow label="Fiscal Day No" value={receipt.fiscalDayNo?.toString()} />
            <InfoRow label="Global No" value={receipt.receiptGlobalNo?.toString()} />
            <InfoRow label="Counter" value={receipt.receiptCounter?.toString()} />
            <InfoRow label="Received At" value={receipt.receivedAt?.toLocaleString()} />
            <InfoRow label="Fiscalised At" value={receipt.fiscalisedAt?.toLocaleString()} />
          </div>
        </div>

        <div className="rounded-md border p-6">
          <h2 className="text-lg font-semibold mb-4">FDMS Response</h2>
          {fdmsResponse ? (
            <pre className="text-xs bg-muted p-4 rounded overflow-x-auto max-h-60">
              {JSON.stringify(fdmsResponse, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">No response yet</p>
          )}
        </div>
      </div>

      {signedFiscalPayload && (
        <div className="mt-6 rounded-md border p-6">
          <h2 className="text-lg font-semibold mb-4">Signed Fiscal Payload</h2>
          <pre className="text-xs bg-muted p-4 rounded overflow-x-auto max-h-96">
            {JSON.stringify(signedFiscalPayload, null, 2)}
          </pre>
        </div>
      )}

      {(receipt.errorCode || receipt.errorMessage) && (
        <div className="mt-6 rounded-md border p-6 border-red-200">
          <h2 className="text-lg font-semibold mb-4 text-red-700">Error Details</h2>
          <div className="space-y-2">
            <InfoRow label="Error Code" value={receipt.errorCode} />
            <InfoRow label="Error Message" value={receipt.errorMessage} />
          </div>
        </div>
      )}

      <div className="mt-6 rounded-md border p-6">
        <h2 className="text-lg font-semibold mb-4">Metadata</h2>
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="FDMS Operation ID" value={receipt.fdmsOperationId} />
          <InfoRow label="FDMS Receipt ID" value={receipt.fdmsReceiptId?.toString()} />
          <InfoRow label="Retry Count" value={receipt.retryCount?.toString()} />
          <InfoRow label="Created At" value={receipt.createdAt?.toLocaleString()} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-right max-w-[60%] truncate">{value || "—"}</dd>
    </div>
  );
}
