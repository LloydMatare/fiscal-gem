import { AppShell } from "@/components/layout/app-shell";

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell mode="tenant">{children}</AppShell>;
}
