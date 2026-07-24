import { db } from "@/db";
import { clients, devices } from "@/db/schema";
import { eq } from "drizzle-orm";
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
