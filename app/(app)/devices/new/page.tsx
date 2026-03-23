import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NoOrganization } from "@/components/auth/NoOrganization";
import NewDeviceForm from "./NewDeviceForm";
import { getAdminStatus } from "@/lib/auth/guards";

export default async function NewDevicePage() {
  const { orgId } = await auth();
  const isAdmin = await getAdminStatus();

  if (!isAdmin) {
    redirect("/devices");
  }

  if (!orgId) {
    return <NoOrganization isAdmin={isAdmin} />;
  }

  return <NewDeviceForm />;
}
