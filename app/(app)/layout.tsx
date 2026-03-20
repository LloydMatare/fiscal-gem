import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sidebar } from "./components/Sidebar";
import {Bell, MessageCircle, Search} from "lucide-react";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-[#f6f2ea] text-[#1e1a17]">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-[#1e1a17]/10 bg-white/80 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#6a5f57]">
                Fiscal Device Gateway
              </p>
              <h1 className="text-lg font-semibold">Operations Console</h1>
            </div>
            <div className="flex items-center gap-4">
              <button className="rounded-full p-2 hover:bg-[#f6f2ea]">
                <Search size={20} />
              </button>
              <button className="rounded-full p-2 hover:bg-[#f6f2ea]">
                <MessageCircle size={20} />
              </button>
              <button className="rounded-full p-2 hover:bg-[#f6f2ea]">
                <Bell size={20} />
              </button>
            </div>
          </header>
          <main className="flex-1 px-6 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
