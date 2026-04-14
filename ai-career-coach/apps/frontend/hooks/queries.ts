import { useQuery } from '@tanstack/react-query';
import { cvService } from '@/services/cv.service';
import { skillGapService } from '@/services/skillGap.service';
import { settingsService } from '@/services/settings.service';
import { dashboardService } from '@/services/dashboard.service';
import { matchingService } from '@/services/matching.service';
import { salaryService } from '@/services/salary.service';
import { applicationService } from '@/services/application.service';
import type { ApplicationStatus } from '@/types/application.types';
import type { MatchFilters } from '@/types/matching.types';

export const queryKeys = {
  cvs: ['cvs'] as const,
  progressSummary: ['progressSummary'] as const,
  preferences: ['preferences'] as const,
  recentActivity: ['recentActivity'] as const,
  jobMatches: (topK: number, filters?: MatchFilters) => ['jobMatches', topK, filters ?? null] as const,
  salaryInsights: (role: string, region: string, country: string) =>
    ['salaryInsights', role, region, country] as const,
  applications: (status?: ApplicationStatus) => ['applications', status] as const,
  applicationStats: ['applicationStats'] as const,
};

export function useUserCVs(enabled = true) {
  return useQuery({
    queryKey: queryKeys.cvs,
    queryFn: () => cvService.getUserCVs(),
    enabled,
  });
}

export function useProgressSummary(enabled = true) {
  return useQuery({
    queryKey: queryKeys.progressSummary,
    queryFn: () => skillGapService.getProgressSummary(),
    enabled,
  });
}

export function useCareerPreferences(enabled = true) {
  return useQuery({
    queryKey: queryKeys.preferences,
    queryFn: () => settingsService.getCareerPreferences(),
    enabled,
  });
}

export function useRecentActivity(enabled = true) {
  return useQuery({
    queryKey: queryKeys.recentActivity,
    queryFn: () => dashboardService.getRecentActivity(),
    enabled,
  });
}

export function useJobMatches(topK = 3, enabled = true, filters?: MatchFilters) {
  return useQuery({
    queryKey: queryKeys.jobMatches(topK, filters),
    queryFn: () => matchingService.findMatches(filters, topK),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

export function useSalaryInsights(
  role: string | undefined,
  region: string | undefined,
  country: string | undefined,
) {
  const effectiveRole = role ?? '';
  const effectiveRegion = region || 'London';
  const effectiveCountry = country || 'gb';

  return useQuery({
    queryKey: queryKeys.salaryInsights(effectiveRole, effectiveRegion, effectiveCountry),
    queryFn: () => salaryService.getInsights(effectiveRole, effectiveRegion, effectiveCountry),
    enabled: !!effectiveRole,
    staleTime: 30 * 60 * 1000,
  });
}

export function useApplications(status?: ApplicationStatus, enabled = true) {
  return useQuery({
    queryKey: queryKeys.applications(status),
    queryFn: () => applicationService.getApplications(status),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useApplicationStats(enabled = true) {
  return useQuery({
    queryKey: queryKeys.applicationStats,
    queryFn: () => applicationService.getStats(),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}
