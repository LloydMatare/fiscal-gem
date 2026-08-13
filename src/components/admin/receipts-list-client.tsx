"use client";

import { useState, useEffect, useCallback } from "react";
import { ReceiptStatusBadge } from "@/components/status-badge";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import Link from "next/link";

interface ReceiptItem {
  id: string;
  deviceId?: number;
  externalReference: string;
  receiptNumber: string | null;
  receiptGlobalNo: number | null;
  invoiceNo: string | null;
  receiptType: string | null;
  receiptCounter: number | null;
  fiscalDayNo: number | null;
  status: string;
  fdmsReceiptId: number | null;
  fdmsOperationId: string | null;
  receivedAt: string | null;
  fiscalisedAt: string | null;
}

interface ReceiptsPage {
  content: ReceiptItem[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

const STATUS_OPTIONS = [
  "",
  "RECEIVED",
  "VALIDATED",
  "SIGNED",
  "QUEUED",
  "PROCESSING",
  "SENT",
  "ACCEPTED",
  "FDMS_ACCEPTED_WITH_VALIDATION_ERRORS",
  "FISCALISED",
  "FAILED",
  "RETRY_PENDING",
  "CANCELLED",
];

export function ReceiptsListClient({
  clientId,
  initialPage,
  initialStatus,
}: {
  clientId: string;
  initialPage: number;
  initialStatus?: string;
}) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState(initialStatus || "");
  const [data, setData] = useState<ReceiptsPage | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("size", String(pageSize));
    if (status) params.set("status", status);

    try {
      const res = await fetch(`/api/admin/clients/${clientId}/receipts?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [clientId, page, pageSize, status]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(0);
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-muted-foreground">Status:</label>
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        >
          <option value="">All</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {data && (
          <span className="text-sm text-muted-foreground">
            {data.totalElements} receipt{data.totalElements !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Global #</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Invoice #</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">FDMS Receipt ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Received</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Fiscalised</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : !data || data.content.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No receipts found
                </td>
              </tr>
            ) : (
              data.content.map((r) => {
                const href = `/admin/clients/${clientId}/receipts/${r.id}`;
                return (
                  <tr key={r.id} className="border-b hover:bg-muted/50 cursor-pointer">
                    <td className="px-4 py-3 text-sm font-medium">
                      <Link href={href} className="block">{r.receiptGlobalNo ?? "—"}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={href} className="block">{r.invoiceNo || "—"}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <Link href={href} className="block">{r.fdmsReceiptId ?? "—"}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link href={href} className="block"><ReceiptStatusBadge status={r.status} /></Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <Link href={href} className="block">
                        {r.receivedAt ? new Date(r.receivedAt).toLocaleString() : "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <Link href={href} className="block">
                        {r.fiscalisedAt ? new Date(r.fiscalisedAt).toLocaleString() : "—"}
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <DataTablePagination
          page={data.number}
          totalPages={data.totalPages}
          total={data.totalElements}
          pageSize={data.size}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(0);
          }}
          itemLabel="receipt"
          itemLabelPlural="receipts"
        />
      )}
    </div>
  );
}
