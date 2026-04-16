'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { WebVitalsReporter } from '@/components/admin/WebVitalsReporter';

export default function AdminRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayout>
      <WebVitalsReporter />
      {children}
    </AdminLayout>
  );
}
