'use client';

import { AdminGuard } from '../auth/AdminGuard';
import { AdminSidebar } from './AdminSidebar';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        <main className="pl-60 min-h-screen">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </AdminGuard>
  );
}
