const files = [
  {
    name: "fiscal-day-2026-03-15.json",
    type: "FiscalDayCounters",
    status: "Processing",
  },
  {
    name: "offline-receipts-2026-03-14.json",
    type: "OfflineReceipts",
    status: "Completed",
  },
];

export default function FilesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Files</h2>
          <p className="text-sm text-[#6a5f57]">
            Submit files and track processing status with FDMS.
          </p>
        </div>
        <button className="rounded-full border border-[#1e1a17]/20 px-5 py-2 text-sm font-semibold text-[#1e1a17]">
          Upload file
        </button>
      </div>

      <div className="grid gap-4">
        {files.map((file) => (
          <div
            key={file.name}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#1e1a17]/10 bg-white/80 p-5"
          >
            <div>
              <p className="text-sm font-semibold">{file.name}</p>
              <p className="text-xs text-[#6a5f57]">{file.type}</p>
            </div>
            <p className="text-xs font-semibold text-[#2a6f67]">{file.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
