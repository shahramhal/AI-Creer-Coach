'use client';

import { useState } from 'react';
import { AdminGuard } from '../auth/AdminGuard';
import { AdminSidebar } from './AdminSidebar';
import { Menu } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../library/utils';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        <AdminSidebar
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
        <main id="main-content" className={cn(
          "min-h-screen transition-all duration-300",
          sidebarCollapsed ? "md:pl-16" : "md:pl-60"
        )}>
          {/* Mobile header for admin */}
          <div className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-background/80 px-4 backdrop-blur-sm md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
            <span className="ml-3 font-semibold text-foreground">Admin Panel</span>
          </div>
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>
    </AdminGuard>
  );
}
