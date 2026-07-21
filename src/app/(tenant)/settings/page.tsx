import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/layout/page-header";

export default async function SettingsPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect("/sign-in");

  const client = await db.query.clients.findFirst({
    where: eq(clients.clerkOrgId, orgId),
  });
  if (!client) redirect("/");

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your organization settings"
      />
      <div className="rounded-md border p-6">
        <h2 className="text-lg font-semibold mb-4">Tax Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <InfoRow label="Tax ID" value={client.taxId} />
          <InfoRow label="Registration Number" value={client.registrationNumber} />
          <InfoRow label="Currency" value={client.currency} />
          <InfoRow label="Time Zone" value={client.timeZone} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}
