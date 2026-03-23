import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NoOrganization } from "@/components/auth/NoOrganization";
import NewDeviceForm from "./NewDeviceForm";

export default async function NewDevicePage() {
  const { orgId, sessionClaims } = await auth();
  const isAdmin = (sessionClaims as any)?.metadata?.role === "admin";

  if (!isAdmin) {
    redirect("/devices");
  }

  if (!orgId) {
    return <NoOrganization isAdmin={isAdmin} />;
  }

  return <NewDeviceForm />;
}
