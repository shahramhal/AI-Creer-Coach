import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  queryKeys,
  useUserCVs,
  useProgressSummary,
  useCareerPreferences,
  useRecentActivity,
  useJobMatches,
  useSalaryInsights,
  useApplications,
  useApplicationStats,
} from './queries';

vi.mock('@/services/cv.service', () => ({
  cvService: { getUserCVs: vi.fn() },
}));
vi.mock('@/services/skillGap.service', () => ({
  skillGapService: { getProgressSummary: vi.fn(), analyze: vi.fn(), getLearningPaths: vi.fn() },
}));
vi.mock('@/services/settings.service', () => ({
  settingsService: { getCareerPreferences: vi.fn() },
}));
vi.mock('@/services/dashboard.service', () => ({
  dashboardService: { getRecentActivity: vi.fn() },
}));
vi.mock('@/services/matching.service', () => ({
  matchingService: { findMatches: vi.fn() },
}));
vi.mock('@/services/salary.service', () => ({
  salaryService: { getInsights: vi.fn() },
}));
vi.mock('@/services/application.service', () => ({
  applicationService: { getApplications: vi.fn(), getStats: vi.fn() },
}));

import { cvService } from '@/services/cv.service';
import { skillGapService } from '@/services/skillGap.service';
import { settingsService } from '@/services/settings.service';
import { dashboardService } from '@/services/dashboard.service';
import { matchingService } from '@/services/matching.service';
import { salaryService } from '@/services/salary.service';
import { applicationService } from '@/services/application.service';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('queryKeys', () => {
  it('should have a static cvs key as a tuple', () => {
    expect(queryKeys.cvs).toEqual(['cvs']);
  });

  it('should have a static progressSummary key', () => {
    expect(queryKeys.progressSummary).toEqual(['progressSummary']);
  });

  it('should have a static preferences key', () => {
    expect(queryKeys.preferences).toEqual(['preferences']);
  });

  it('should have a static recentActivity key', () => {
    expect(queryKeys.recentActivity).toEqual(['recentActivity']);
  });

  it('should have a static applicationStats key', () => {
    expect(queryKeys.applicationStats).toEqual(['applicationStats']);
  });

  describe('jobMatches', () => {
    it('should include the topK value in the key', () => {
      expect(queryKeys.jobMatches(10)).toEqual(['jobMatches', 10, null]);
    });

    it('should include filters in the key when provided', () => {
      const filters = { title_keywords: 'python' };
      expect(queryKeys.jobMatches(10, filters)).toEqual(['jobMatches', 10, filters]);
    });

    it('should produce distinct keys for different topK values', () => {
      const keyA = queryKeys.jobMatches(3);
      const keyB = queryKeys.jobMatches(50);
      expect(keyA).not.toEqual(keyB);
    });

    it('should produce distinct keys for different filters', () => {
      const keyA = queryKeys.jobMatches(10, { title_keywords: 'python' });
      const keyB = queryKeys.jobMatches(10, { title_keywords: 'java' });
      expect(keyA).not.toEqual(keyB);
    });
  });

  describe('salaryInsights', () => {
    it('should include role, region, and country in the key', () => {
      expect(queryKeys.salaryInsights('Engineer', 'London', 'gb')).toEqual([
        'salaryInsights',
        'Engineer',
        'London',
        'gb',
      ]);
    });

    it('should produce distinct keys for different roles', () => {
      const keyA = queryKeys.salaryInsights('Engineer', 'London', 'gb');
      const keyB = queryKeys.salaryInsights('Manager', 'London', 'gb');
      expect(keyA).not.toEqual(keyB);
    });
  });

  describe('applications', () => {
    it('should include the status when provided', () => {
      expect(queryKeys.applications('interview')).toEqual(['applications', 'interview']);
    });

    it('should include undefined when no status is provided', () => {
      expect(queryKeys.applications(undefined)).toEqual(['applications', undefined]);
    });

    it('should produce distinct keys for different statuses', () => {
      const appliedKey = queryKeys.applications('applied');
      const interviewKey = queryKeys.applications('interview');
      expect(appliedKey).not.toEqual(interviewKey);
    });
  });
});

describe('useUserCVs', () => {
  it('should call cvService.getUserCVs and return data', async () => {
    const mockData = { success: true, data: [] };
    (cvService.getUserCVs as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);
    const { result } = renderHook(() => useUserCVs(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });

  it('should not fetch when enabled is false', () => {
    const { result } = renderHook(() => useUserCVs(false), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(cvService.getUserCVs).not.toHaveBeenCalled();
  });
});

describe('useProgressSummary', () => {
  it('should call skillGapService.getProgressSummary and return data', async () => {
    const mockData = { success: true, data: { totalPaths: 2 } };
    (skillGapService.getProgressSummary as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);
    const { result } = renderHook(() => useProgressSummary(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });
});

describe('useCareerPreferences', () => {
  it('should call settingsService.getCareerPreferences and return data', async () => {
    const mockData = { success: true, data: { jobTitle: 'Engineer' } };
    (settingsService.getCareerPreferences as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);
    const { result } = renderHook(() => useCareerPreferences(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });
});

describe('useRecentActivity', () => {
  it('should call dashboardService.getRecentActivity and return data', async () => {
    const mockData = [{ id: 1, type: 'login' }];
    (dashboardService.getRecentActivity as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);
    const { result } = renderHook(() => useRecentActivity(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });
});

describe('useJobMatches', () => {
  it('should call matchingService.findMatches with topK and filters', async () => {
    const mockData = { success: true, data: { matches: [] } };
    (matchingService.findMatches as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);
    const filters = { title_keywords: 'python' };
    const { result } = renderHook(() => useJobMatches(10, true, filters), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(matchingService.findMatches).toHaveBeenCalledWith(filters, 10);
  });

  it('should not fetch when enabled is false', () => {
    const { result } = renderHook(() => useJobMatches(10, false), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(matchingService.findMatches).not.toHaveBeenCalled();
  });
});

describe('useSalaryInsights', () => {
  it('should call salaryService.getInsights when role is defined', async () => {
    const mockData = { success: true, data: { median: 50000 } };
    (salaryService.getInsights as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);
    const { result } = renderHook(
      () => useSalaryInsights('Software Engineer', 'London', 'gb'),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(salaryService.getInsights).toHaveBeenCalledWith('Software Engineer', 'London', 'gb');
  });

  it('should not fetch when role is undefined', () => {
    const { result } = renderHook(
      () => useSalaryInsights(undefined, 'London', 'gb'),
      { wrapper: createWrapper() }
    );
    expect(result.current.fetchStatus).toBe('idle');
    expect(salaryService.getInsights).not.toHaveBeenCalled();
  });

  it('should default region to London and country to gb when not provided', async () => {
    const mockData = { success: true, data: {} };
    (salaryService.getInsights as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);
    const { result } = renderHook(
      () => useSalaryInsights('Engineer', undefined, undefined),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(salaryService.getInsights).toHaveBeenCalledWith('Engineer', 'London', 'gb');
  });
});

describe('useApplications', () => {
  it('should call applicationService.getApplications with status', async () => {
    const mockData = { success: true, data: [] };
    (applicationService.getApplications as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);
    const { result } = renderHook(
      () => useApplications('applied'),
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(applicationService.getApplications).toHaveBeenCalledWith('applied');
  });

  it('should not fetch when enabled is false', () => {
    const { result } = renderHook(() => useApplications(undefined, false), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useApplicationStats', () => {
  it('should call applicationService.getStats and return data', async () => {
    const mockData = { success: true, data: { total: 5 } };
    (applicationService.getStats as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);
    const { result } = renderHook(() => useApplicationStats(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(applicationService.getStats).toHaveBeenCalled();
  });
});
