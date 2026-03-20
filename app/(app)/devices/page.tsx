const devices = [
  {
    id: "187",
    serial: "ZIMRA-SN: 001",
    branch: "Harare CBD",
    status: "Registered",
    certificate: "Valid until 2026-04-20",
  },
  {
    id: "214",
    serial: "ZIMRA-SN: 014",
    branch: "Bulawayo Central",
    status: "Active",
    certificate: "Valid until 2026-05-02",
  },
];

export default function DevicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Devices</h2>
          <p className="text-sm text-[#6a5f57]">
            Track device registration, certificates, and branch metadata.
          </p>
        </div>
        <button className="rounded-full bg-[#1e1a17] px-5 py-2 text-sm font-semibold text-[#f6f2ea]">
          Register device
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#1e1a17]/10 bg-white/80">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#1e1a17]/10 text-xs uppercase tracking-[0.2em] text-[#6a5f57]">
            <tr>
              <th className="px-6 py-4">Device</th>
              <th className="px-6 py-4">Branch</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Certificate</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => (
              <tr key={device.id} className="border-b border-[#1e1a17]/5">
                <td className="px-6 py-4">
                  <p className="font-semibold">{device.serial}</p>
                  <p className="text-xs text-[#6a5f57]">Device ID {device.id}</p>
                </td>
                <td className="px-6 py-4 text-[#463f3a]">{device.branch}</td>
                <td className="px-6 py-4 text-[#2a6f67]">{device.status}</td>
                <td className="px-6 py-4 text-[#463f3a]">
                  {device.certificate}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
