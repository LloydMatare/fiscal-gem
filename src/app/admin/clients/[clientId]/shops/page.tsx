import { db } from "@/db";
import { clients, shops } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { CreateShopButton } from "@/components/admin/create-shop-button";
import Link from "next/link";

export default async function AdminShopsPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
  });
  if (!client) notFound();

  const shopsList = await db.query.shops.findMany({
    where: eq(shops.clientId, clientId),
    orderBy: (shops, { desc }) => [desc(shops.createdAt)],
  });

  return (
    <div>
      <PageHeader
        title="Shops"
        description={`Shops for ${client.name}`}
        breadcrumbs={[
          { label: "Clients", href: "/admin/clients" },
          { label: client.name, href: `/admin/clients/${clientId}` },
          { label: "Shops", href: "#" },
        ]}
      >
        <CreateShopButton clientId={clientId} />
      </PageHeader>

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">City</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Contact Person</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Phone</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Created</th>
            </tr>
          </thead>
          <tbody>
            {shopsList.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No shops found
                </td>
              </tr>
            ) : (
              shopsList.map((shop) => {
                const href = `/admin/clients/${clientId}/shops/${shop.id}`;
                return (
                  <tr key={shop.id} className="border-b hover:bg-muted/50 cursor-pointer">
                    <td className="px-4 py-3 text-sm font-medium">
                      <Link href={href} className="block">{shop.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={href} className="block">{shop.city || "—"}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={href} className="block">{shop.contactPerson || "—"}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={href} className="block">{shop.contactPhone || "—"}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <Link href={href} className="block">{new Date(shop.createdAt).toLocaleDateString()}</Link>
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
