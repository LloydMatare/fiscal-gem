"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";

const STATUSES = [
  "RECEIVED", "VALIDATED", "SIGNED", "QUEUED", "PROCESSING",
  "SENT", "ACCEPTED", "FDMS_ACCEPTED_WITH_VALIDATION_ERRORS",
  "FISCALISED", "FAILED", "RETRY_PENDING", "CANCELLED",
];

export function ReceiptFilter({
  total,
}: {
  total: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status") || "ALL";

  const setStatus = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "ALL") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    params.set("page", "0");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3 mb-4">
      <Select value={currentStatus} onValueChange={(v) => setStatus(v ?? "ALL")}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All statuses</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-sm text-muted-foreground">
        {total} receipt{total !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

export function ReceiptPagination({
  page,
  total,
  pageSize,
}: {
  page: number;
  total: number;
  pageSize: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`?${params.toString()}`);
  };

  const changePageSize = (newSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("size", String(newSize));
    params.set("page", "0");
    router.push(`?${params.toString()}`);
  };

  return (
    <DataTablePagination
      page={page}
      total={total}
      pageSize={pageSize}
      totalPages={Math.ceil(total / pageSize)}
      onPageChange={goToPage}
      onPageSizeChange={changePageSize}
      itemLabel="receipt"
      itemLabelPlural="receipts"
    />
  );
}
