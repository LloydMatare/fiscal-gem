"use client";

import { ReactNode } from "react";
import { useSessionList } from "@clerk/nextjs";

export function MultisessionAppSupport({ children }: { children: ReactNode }) {
  const { sessions } = useSessionList();
  const activeSession = sessions?.find((session) => session.status === "active");

  return <div key={activeSession?.id}>{children}</div>;
}