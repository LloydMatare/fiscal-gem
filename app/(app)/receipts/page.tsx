const receipts = [
  {
    id: "R-1029",
    device: "ZIMRA-SN: 001",
    total: "ZWL 12,420",
    status: "Submitted",
    time: "14:32",
  },
  {
    id: "R-1030",
    device: "ZIMRA-SN: 001",
    total: "ZWL 4,110",
    status: "Accepted",
    time: "14:45",
  },
  {
    id: "R-2201",
    device: "ZIMRA-SN: 014",
    total: "ZWL 8,920",
    status: "Rejected",
    time: "15:03",
  },
];

export default function ReceiptsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Receipts</h2>
        <p className="text-sm text-[#6a5f57]">
          Monitor receipt submissions, QR URLs, and response codes.
        </p>
      </div>

      <div className="grid gap-4">
        {receipts.map((receipt) => (
          <div
            key={receipt.id}
            className="rounded-2xl border border-[#1e1a17]/10 bg-white/80 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">{receipt.id}</p>
                <p className="text-xs text-[#6a5f57]">{receipt.device}</p>
              </div>
              <div className="text-right text-xs">
                <p className="font-semibold text-[#2a6f67]">{receipt.status}</p>
                <p className="text-[#6a5f57]">{receipt.time}</p>
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold">{receipt.total}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
