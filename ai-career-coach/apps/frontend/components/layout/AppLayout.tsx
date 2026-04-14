'use client';

import { ReactNode, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { AppSidebar } from "./AppSidebar";
import { TopNav } from "./TopNav";
import { cn } from "../../library/utils";
import { slideUp } from "../../library/motion";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <div className={cn(
        "transition-all duration-300 min-w-0 overflow-x-hidden",
        sidebarCollapsed ? "md:pl-16" : "md:pl-60"
      )}>
        <TopNav onMenuClick={() => setMobileSidebarOpen(true)} />
        <main id="main-content" className="p-4 md:p-6 min-w-0">
          <motion.div
            key={pathname}
            variants={slideUp}
            initial="hidden"
            animate="visible"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
