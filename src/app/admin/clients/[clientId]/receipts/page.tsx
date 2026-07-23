import { db } from "@/db";
import { clients, receipts, devices } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ReceiptStatusBadge } from "@/components/status-badge";
import { SubmitReceiptButton } from "@/components/admin/submit-receipt-button";
import Link from "next/link";

export default async function AdminReceiptsPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
  });
  if (!client) notFound();

  const device = await db.query.devices.findFirst({
    where: eq(devices.clientId, clientId),
  });

  const receiptList = await db.query.receipts.findMany({
    where: eq(receipts.clientId, clientId),
    orderBy: [desc(receipts.receivedAt)],
    limit: 100,
  });

  return (
    <div>
      <PageHeader
        title="Receipts"
        description={`Receipts for ${client.name}`}
        breadcrumbs={[
          { label: "Clients", href: "/admin/clients" },
          { label: client.name, href: `/admin/clients/${clientId}` },
          { label: "Receipts", href: "#" },
        ]}
      >
        {device?.deviceId != null && (
          <SubmitReceiptButton
            clientId={clientId}
            deviceId={device.deviceId}
            deviceModelName={device.modelName}
            deviceModelVersion={device.modelVersion}
          />
        )}
      </PageHeader>

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Global #</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">External Ref</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Invoice #</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Received</th>
            </tr>
          </thead>
          <tbody>
            {receiptList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No receipts found
                </td>
              </tr>
            ) : (
              receiptList.map((r) => {
                const href = `/admin/clients/${clientId}/receipts/${r.id}`;
                return (
                  <tr key={r.id} className="border-b hover:bg-muted/50 cursor-pointer">
                    <td className="px-4 py-3 text-sm font-medium">
                      <Link href={href} className="block">{r.receiptGlobalNo || "—"}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={href} className="block">{r.externalReference || "—"}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={href} className="block">{r.invoiceNo || "—"}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={href} className="block">{r.receiptType || "—"}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={href} className="block"><ReceiptStatusBadge status={r.status} /></Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <Link href={href} className="block">{r.receivedAt?.toLocaleString()}</Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
