import { auth } from "@clerk/nextjs/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await auth.protect();
  return <AppShell mode="tenant">{children}</AppShell>;
}
