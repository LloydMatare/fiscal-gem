import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgRole } = await auth.protect();
  if (orgRole !== "org:admin") {
    redirect("/");
  }
  return <AppShell mode="admin">{children}</AppShell>;
}
