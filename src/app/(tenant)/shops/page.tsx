import { resolveClient } from "@/lib/tenant";
import { OrgNotConfigured } from "@/components/layout/org-not-configured";
import { db } from "@/db";
import { shops } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";

export default async function ShopsPage() {
  const resolved = await resolveClient();
  if (!resolved) return <OrgNotConfigured />;
  const { client } = resolved;

  return (
    <div>
      <PageHeader
        title="Shops"
        description="Manage your business locations"
      />
      <ShopsTable clientId={client.id} />
    </div>
  );
}

async function ShopsTable({ clientId }: { clientId: string }) {
  const shopsList = await db.query.shops.findMany({
    where: eq(shops.clientId, clientId),
    orderBy: (shops, { desc }) => [desc(shops.createdAt)],
  });

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">City</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Contact Person</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Created</th>
          </tr>
        </thead>
        <tbody>
          {shopsList.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                No shops found
              </td>
            </tr>
          ) : (
            shopsList.map((shop) => {
              const href = `/shops/${shop.id}`;
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
  );
}
