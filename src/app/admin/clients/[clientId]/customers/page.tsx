import { db } from "@/db";
import { clients, customers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/tenant";
import { PageHeader } from "@/components/layout/page-header";
import { CreateCustomerButton } from "@/components/admin/create-customer-button";
import { CustomerDeleteButton } from "@/components/admin/customer-delete-button";
import Link from "next/link";

export default async function AdminCustomersPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  await requireAdminPage();
  const { clientId } = await params;

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
  });
  if (!client) notFound();

  const customersList = await db.query.customers.findMany({
    where: eq(customers.clientId, clientId),
    orderBy: (customers, { desc }) => [desc(customers.createdAt)],
  });

  return (
    <div>
      <PageHeader
        title="Customers"
        description={`Customers for ${client.name}`}
        breadcrumbs={[
          { label: "Clients", href: "/admin/clients" },
          { label: client.name, href: `/admin/clients/${clientId}` },
          { label: "Customers", href: "#" },
        ]}
      >
        <CreateCustomerButton clientId={clientId} />
      </PageHeader>

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">TIN</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Phone</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">City</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customersList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No customers found
                </td>
              </tr>
            ) : (
              customersList.map((customer) => (
                <tr key={customer.id} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm font-medium">{customer.name}</td>
                  <td className="px-4 py-3 text-sm">{customer.tin || "—"}</td>
                  <td className="px-4 py-3 text-sm">{customer.phone || "—"}</td>
                  <td className="px-4 py-3 text-sm">{customer.email || "—"}</td>
                  <td className="px-4 py-3 text-sm">{customer.city || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <CustomerDeleteButton customerId={customer.id} clientId={clientId} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
