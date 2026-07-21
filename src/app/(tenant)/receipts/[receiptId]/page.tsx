import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { clients, receipts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ReceiptStatusBadge } from "@/components/status-badge";

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ receiptId: string }>;
}) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect("/sign-in");

  const client = await db.query.clients.findFirst({
    where: eq(clients.clerkOrgId, orgId),
  });
  if (!client) redirect("/");

  const { receiptId } = await params;
  const receipt = await db.query.receipts.findFirst({
    where: eq(receipts.id, receiptId),
  });

  if (!receipt || receipt.clientId !== client.id) notFound();

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
