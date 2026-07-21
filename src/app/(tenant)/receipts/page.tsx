import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { clients, receipts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { PageHeader } from "@/components/layout/page-header";
import { ReceiptStatusBadge } from "@/components/status-badge";
import Link from "next/link";

export default async function ReceiptsPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect("/sign-in");

  const client = await db.query.clients.findFirst({
    where: eq(clients.clerkOrgId, orgId),
  });
  if (!client) redirect("/");

  const receiptList = await db.query.receipts.findMany({
    where: eq(receipts.clientId, client.id),
    orderBy: [desc(receipts.receivedAt)],
    limit: 50,
  });

  return (
    <div>
      <PageHeader
        title="Receipts"
        description="View your fiscal receipts"
      />
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">#</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">External Ref</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Received</th>
            </tr>
          </thead>
          <tbody>
            {receiptList.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No receipts found
                </td>
              </tr>
            ) : (
              receiptList.map((r) => {
                const href = `/receipts/${r.id}`;
                return (
                  <tr key={r.id} className="border-b hover:bg-muted/50 cursor-pointer">
                    <td className="px-4 py-3 text-sm font-medium">
                      <Link href={href} className="block">{r.receiptGlobalNo}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={href} className="block">{r.externalReference}</Link>
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
