import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function AppShell({
  children,
  mode = "tenant",
}: {
  children: React.ReactNode;
  mode?: "admin" | "tenant";
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar mode={mode} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header mode={mode} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
