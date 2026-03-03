'use client';

import { useEffect, useState } from 'react';
import { adminService } from '@/services/admin.service';
import type { AdminDashboardStats, UserGrowthPoint, JobStats } from '@/types/admin.types';
import { AdminOverviewStats } from '@/components/admin/AdminOverviewStats';
import { UserGrowthChart } from '@/components/admin/UserGrowthChart';
import { JobDistributionChart } from '@/components/admin/JobDistributionChart';
import { ServiceHealthPanel } from '@/components/admin/ServiceHealthPanel';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [userGrowth, setUserGrowth] = useState<UserGrowthPoint[]>([]);
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [statsRes, growthRes, jobStatsRes] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getUserGrowthTrend(30),
        adminService.getJobStats(),
      ]);
      setStats(statsRes.data.data);
      setUserGrowth(growthRes.data.data);
      setJobStats(jobStatsRes.data.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      {stats && <AdminOverviewStats stats={stats} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserGrowthChart data={userGrowth} />
        {jobStats && <JobDistributionChart data={jobStats} />}
      </div>

      <ServiceHealthPanel />
    </div>
  );
}
