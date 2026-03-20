export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="text-sm text-[#6a5f57]">
          Configure FDMS environment, certificates, and organization metadata.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[#1e1a17]/10 bg-white/80 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#6a5f57]">
            Environment
          </p>
          <p className="mt-3 text-sm font-semibold">Testing</p>
          <p className="text-xs text-[#6a5f57]">https://fdmsapitest.zimra.co.zw</p>
        </div>
        <div className="rounded-2xl border border-[#1e1a17]/10 bg-white/80 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#6a5f57]">
            Certificate
          </p>
          <p className="mt-3 text-sm font-semibold">No device selected</p>
          <p className="text-xs text-[#6a5f57]">
            Upload a PEM certificate + key for mTLS requests.
          </p>
        </div>
      </div>
    </div>
  );
}
