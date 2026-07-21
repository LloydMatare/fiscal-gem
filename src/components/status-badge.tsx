import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-fedge-mid/15 text-fedge-dark border-fedge-mid/25" },
  INACTIVE: { label: "Inactive", className: "bg-muted text-muted-foreground border-border" },
  SUSPENDED: { label: "Suspended", className: "bg-fedge-gold/20 text-fedge-dark border-fedge-gold/30" },
  DELETED: { label: "Deleted", className: "bg-red-100 text-red-800 border-red-200" },
};

export function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const config = statusConfig[status] || {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

const receiptStatusConfig: Record<string, { label: string; className: string }> = {
  RECEIVED: { label: "Received", className: "bg-fedge-mid/10 text-fedge-dark border-fedge-mid/20" },
  VALIDATED: { label: "Validated", className: "bg-fedge-mid/15 text-fedge-dark border-fedge-mid/25" },
  SIGNED: { label: "Signed", className: "bg-fedge-gold/15 text-fedge-dark border-fedge-gold/25" },
  QUEUED: { label: "Queued", className: "bg-fedge-gold/10 text-fedge-dark border-fedge-gold/20" },
  PROCESSING: { label: "Processing", className: "bg-fedge-gold/20 text-fedge-dark border-fedge-gold/30" },
  SENT: { label: "Sent", className: "bg-fedge-gold/20 text-fedge-dark border-fedge-gold/30" },
  ACCEPTED: { label: "Accepted", className: "bg-fedge-mid/20 text-fedge-dark border-fedge-mid/30" },
  FISCALISED: { label: "Fiscalised", className: "bg-fedge-mid/20 text-fedge-dark border-fedge-mid/30" },
  FAILED: { label: "Failed", className: "bg-red-100 text-red-800 border-red-200" },
  RETRY: { label: "Retry", className: "bg-fedge-gold/15 text-fedge-dark border-fedge-gold/25" },
};

export function ReceiptStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const config = receiptStatusConfig[status] || {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

export function AgentOnlineIndicator({ online }: { online: boolean | null }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          online ? "bg-fedge-mid" : "bg-muted-foreground/40"
        )}
      />
      <span className="text-sm text-muted-foreground">
        {online ? "Online" : "Offline"}
      </span>
    </span>
  );
}
