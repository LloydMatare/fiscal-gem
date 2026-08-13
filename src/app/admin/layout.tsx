import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell mode="admin">{children}</AppShell>;
}
