import { resolveClient } from "@/lib/tenant";
import { OrgNotConfigured } from "@/components/layout/org-not-configured";
import { db } from "@/db";
import { receipts } from "@/db/schema";
import { eq, desc, count, and } from "drizzle-orm";
import { PageHeader } from "@/components/layout/page-header";
import { ReceiptStatusBadge } from "@/components/status-badge";
import Link from "next/link";
import { SubmitReceiptButton } from "./submit-receipt-button";
import { ReceiptPagination, ReceiptFilter } from "./receipt-pagination";

const PAGE_SIZE = 20;

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const resolved = await resolveClient();
  if (!resolved) return <OrgNotConfigured />;
  const { client } = resolved;

  const params = await searchParams;
  const page = Math.max(0, parseInt(params.page || "0"));
  const statusFilter = params.status || undefined;

  const conditions = [eq(receipts.clientId, client.id)];
  if (statusFilter) {
    conditions.push(eq(receipts.status, statusFilter as any));
  }
  const whereClause = and(...conditions);

  const [{ total }] = await db
    .select({ total: count() })
    .from(receipts)
    .where(whereClause);

  const receiptList = await db.query.receipts.findMany({
    where: whereClause,
    orderBy: [desc(receipts.receivedAt)],
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <PageHeader title="Receipts" description="View and submit fiscal receipts">
        <SubmitReceiptButton />
      </PageHeader>

      <ReceiptFilter total={total} />

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">#</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">External Ref</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Receipt No</th>
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
                      <Link href={href} className="block">{r.receiptNumber || "—"}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={href} className="block"><ReceiptStatusBadge status={r.status} /></Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <Link href={href} className="block">
                        {r.receivedAt?.toLocaleString()}
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ReceiptPagination page={page} totalPages={totalPages} />
    </div>
  );
}
