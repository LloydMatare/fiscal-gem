import { db } from "@/db";
import { clients, devices, receipts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { SubmitReceiptButton } from "@/components/admin/submit-receipt-button";
import { ReceiptsListClient } from "@/components/admin/receipts-list-client";

export default async function AdminReceiptsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { clientId } = await params;
  const { page, status } = await searchParams;

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
  });
  if (!client) notFound();

  const device = await db.query.devices.findFirst({
    where: eq(devices.clientId, clientId),
  });

  // Compute next invoice number from previous receipts for today's date
  let nextInvoiceNo: string | undefined;
  if (device?.deviceId != null) {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const todayPrefix = `INV-${device.deviceId}-${todayStr}-`;
    const lastReceipt = await db.query.receipts.findFirst({
      where: and(
        eq(receipts.clientId, clientId),
        eq(receipts.deviceId, device.id)
      ),
      orderBy: [desc(receipts.invoiceNo)],
    });
    const lastInvoice = lastReceipt?.invoiceNo || "";
    const match = lastInvoice.startsWith(todayPrefix)
      ? lastInvoice.match(/(\d+)$/)
      : null;
    const nextSeq = match ? Number(match[1]) + 1 : 1;
    nextInvoiceNo = `${todayPrefix}${String(nextSeq).padStart(4, "0")}`;
  }

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
            deviceModelName={device.deviceModelName}
            deviceModelVersion={device.deviceModelVersion}
            nextInvoiceNo={nextInvoiceNo}
          />
        )}
      </PageHeader>

      <ReceiptsListClient
        clientId={clientId}
        initialPage={page ? parseInt(page) : 0}
        initialStatus={status}
      />
    </div>
  );
}
