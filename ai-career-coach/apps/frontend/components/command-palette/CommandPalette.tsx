'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  ScanSearch,
  Briefcase,
  DollarSign,
  GraduationCap,
  User,
  Settings,
  Upload,
  Play,
  TrendingUp,
  BookOpen,
  Clock,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { Skeleton } from '@/components/ui/skeleton';
import { dashboardService } from '@/services/dashboard.service';
import type { DashboardActivity } from '@/types/dashboard.types';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const pageItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'CV Analysis', href: '/cvs', icon: FileText },
  { label: 'ATS Score', href: '/ats-score', icon: ScanSearch },
  { label: 'Job Matches', href: '/jobs', icon: Briefcase },
  { label: 'Salary Insights', href: '/salary-insights', icon: DollarSign },
  { label: 'Learning Paths', href: '/learning', icon: GraduationCap },
  { label: 'Profile', href: '/profile', icon: User },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const quickActionItems = [
  { label: 'Upload CV', href: '/cvs', icon: Upload },
  { label: 'Analyze CV', href: '/cvs', icon: FileText },
  { label: 'Run Job Matching', href: '/jobs', icon: Play },
  { label: 'Check Salary Insights', href: '/salary-insights', icon: TrendingUp },
  { label: 'Analyze Skill Gap', href: '/learning', icon: BookOpen },
];

const RECENT_ACTIVITY_LIMIT = 5;

const activityTypeHrefMap: Record<DashboardActivity['type'], string> = {
  cv_upload: '/cvs',
  cv_update: '/cvs',
  cv_delete: '/cvs',
  cv_analyze: '/cvs',
  ats_check: '/ats-score',
  profile_update: '/profile',
  settings_update: '/settings',
  job_saved: '/jobs',
  learning_started: '/learning',
  learning_completed: '/learning',
  application: '/jobs',
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [recentActivities, setRecentActivities] = useState<DashboardActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setRecentActivities([]);
    setActivitiesLoading(true);

    dashboardService
      .getRecentActivity()
      .then((activities) => {
        if (!cancelled) {
          setRecentActivities(activities.slice(0, RECENT_ACTIVITY_LIMIT));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRecentActivities([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setActivitiesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSelect = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [router, onOpenChange]
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, actions, recent activity..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Pages">
          {pageItems.map((item) => (
            <CommandItem
              key={item.href}
              value={`page: ${item.label}`}
              onSelect={() => handleSelect(item.href)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          {quickActionItems.map((item) => (
            <CommandItem
              key={item.label}
              value={`action: ${item.label}`}
              onSelect={() => handleSelect(item.href)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Recent Activity">
          {activitiesLoading ? (
            <>
              {Array.from({ length: RECENT_ACTIVITY_LIMIT }).map((_, index) => (
                <div key={index} className="flex items-center gap-2 px-2 py-1.5">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </>
          ) : recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <CommandItem
                key={activity.id}
                value={`activity: ${activity.title}`}
                onSelect={() =>
                  handleSelect(activityTypeHrefMap[activity.type] ?? '/dashboard')
                }
              >
                <Clock className="mr-2 h-4 w-4" />
                <span className="flex-1 truncate">{activity.title}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {activity.description}
                </span>
              </CommandItem>
            ))
          ) : (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              No recent activity
            </p>
          )}
        </CommandGroup>
      </CommandList>

      <div className="flex items-center justify-center gap-4 border-t px-3 py-2 text-xs text-muted-foreground">
        <span>
          <kbd className="rounded border border-border bg-muted px-1 font-mono">
            &crarr;
          </kbd>{' '}
          to open
        </span>
        <span>
          <kbd className="rounded border border-border bg-muted px-1 font-mono">
            &uarr;
          </kbd>
          <kbd className="ml-0.5 rounded border border-border bg-muted px-1 font-mono">
            &darr;
          </kbd>{' '}
          to navigate
        </span>
        <span>
          <kbd className="rounded border border-border bg-muted px-1 font-mono">
            ESC
          </kbd>{' '}
          to close
        </span>
      </div>
    </CommandDialog>
  );
}
