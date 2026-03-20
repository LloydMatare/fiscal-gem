const stats = [
  { label: "Active devices", value: "4" },
  { label: "Open fiscal days", value: "2" },
  { label: "Receipts today", value: "412" },
  { label: "Files pending", value: "3" },
];

const tasks = [
  {
    title: "Renew certificate",
    detail: "ZIMRA-SN: 001 expires in 14 days",
    status: "High",
  },
  {
    title: "Close fiscal day",
    detail: "Device 187 • Harare CBD",
    status: "Due 18:00",
  },
  {
    title: "Submit file",
    detail: "Fiscal day counters file (March 15)",
    status: "Awaiting",
  },
];

const devices = [
  {
    name: "ZIMRA-SN: 001",
    branch: "Harare CBD",
    status: "Online",
    mode: "Online",
  },
  {
    name: "ZIMRA-SN: 014",
    branch: "Bulawayo Central",
    status: "Closing",
    mode: "Online",
  },
  {
    name: "ZIMRA-SN: 102",
    branch: "Mutare",
    status: "Offline",
    mode: "Offline",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-[#1e1a17]/10 bg-white/80 p-4"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#6a5f57]">
              {stat.label}
            </p>
            <p className="mt-3 text-2xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-[#1e1a17]/10 bg-white/80 p-6">
          <h2 className="text-lg font-semibold">Device status</h2>
          <div className="mt-4 space-y-4">
            {devices.map((device) => (
              <div
                key={device.name}
                className="flex items-center justify-between rounded-2xl border border-[#1e1a17]/10 bg-[#f6f2ea] p-4"
              >
                <div>
                  <p className="text-sm font-semibold">{device.name}</p>
                  <p className="text-xs text-[#6a5f57]">{device.branch}</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-semibold text-[#2a6f67]">{device.status}</p>
                  <p className="text-[#6a5f57]">{device.mode}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[#1e1a17]/10 bg-[#1e1a17] p-6 text-[#f6f2ea]">
          <h2 className="text-lg font-semibold">Next actions</h2>
          <div className="mt-4 space-y-4">
            {tasks.map((task) => (
              <div
                key={task.title}
                className="rounded-2xl border border-[#f6f2ea]/10 bg-[#2a2421] p-4"
              >
                <p className="text-sm font-semibold">{task.title}</p>
                <p className="text-xs text-[#f6f2ea]/70">{task.detail}</p>
                <p className="mt-2 text-xs font-semibold text-[#f0c98d]">
                  {task.status}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
