'use client';

import { Users, FileText, Briefcase, ClipboardList, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminDashboardStats } from '@/types/admin.types';

interface Props {
  stats: AdminDashboardStats;
}

const statCards = [
  { key: 'totalUsers', label: 'Total Users', icon: Users, color: 'text- red-500' },
  { key: 'totalCVs', label: 'Total CVs', icon: FileText, color: 'text-green-500' },
  { key: 'totalJobs', label: 'Total Jobs', icon: Briefcase, color: 'text-purple-500' },
  { key: 'totalApplications', label: 'Applications', icon: ClipboardList, color: 'text-orange-500' },
  { key: 'adminCount', label: 'Admins', icon: ShieldCheck, color: 'text-emerald-500' },
  { key: 'disabledUsers', label: 'Disabled Users', icon: ShieldAlert, color: 'text-red-500' },
] as const;

export function AdminOverviewStats({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {statCards.map((card) => (
        <Card key={card.key}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold mt-1">
                  {stats[card.key as keyof AdminDashboardStats]?.toLocaleString?.() ?? stats[card.key as keyof AdminDashboardStats]}
                </p>
              </div>
              <card.icon className={`h-8 w-8 ${card.color} opacity-80`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
