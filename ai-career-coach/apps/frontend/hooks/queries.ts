import { useQuery } from '@tanstack/react-query';
import { cvService } from '@/services/cv.service';
import { skillGapService } from '@/services/skillGap.service';
import { settingsService } from '@/services/settings.service';
import { dashboardService } from '@/services/dashboard.service';
import { matchingService } from '@/services/matching.service';
import { salaryService } from '@/services/salary.service';

export const queryKeys = {
  cvs: ['cvs'] as const,
  progressSummary: ['progressSummary'] as const,
  preferences: ['preferences'] as const,
  recentActivity: ['recentActivity'] as const,
  jobMatches: (topK: number) => ['jobMatches', topK] as const,
  salaryInsights: (role: string, region: string, country: string) =>
    ['salaryInsights', role, region, country] as const,
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

export function useJobMatches(topK = 3, enabled = true) {
  return useQuery({
    queryKey: queryKeys.jobMatches(topK),
    queryFn: () => matchingService.findMatches(undefined, topK, undefined, 100),
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
