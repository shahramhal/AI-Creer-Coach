'use client';

import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopNav } from "./TopNav";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="pl-60 transition-all duration-300">
        <TopNav />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
