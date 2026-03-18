'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import dynamic from 'next/dynamic';
import { AppLayout } from '@/components/layout/AppLayout';
import { CVHealthScore } from "@/components/dashboard/CVHealthScore";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { RecommendedActions } from "@/components/dashboard/RecommendedActions";
import { JobMatchPreview } from "@/components/dashboard/JobMatchPreview";
import { cvService } from '@/services/cv.service';
import { skillGapService } from '@/services/skillGap.service';
import { settingsService } from '@/services/settings.service';
import { dashboardService } from '@/services/dashboard.service';
import { matchingService } from '@/services/matching.service';
import { salaryService } from '@/services/salary.service';
import type { CV } from '@/types/cv.types';
import type { CareerPreferences } from '@/types/settings.types';
import type { ProgressSummary } from '@/types/skillGap.types';
import type { DashboardActivity } from '@/types/dashboard.types';
import type { MatchedJob } from '@/types/matching.types';
import type { SalaryInsightsData } from '@/types/salary.types';

const ApplicationChart = dynamic(() => import("@/components/dashboard/ApplicationChart").then(m => m.ApplicationChart), { ssr: false });
const ApplicationKanban = dynamic(() => import("@/components/dashboard/ApplicationKanban").then(m => m.ApplicationKanban), { ssr: false });
const MarketInsights = dynamic(() => import("@/components/dashboard/MarketInsights").then(m => m.MarketInsights), { ssr: false });

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingSecondary, setIsLoadingSecondary] = useState(false);

  const [primaryCv, setPrimaryCv] = useState<CV | null>(null);
  const [hasCv, setHasCv] = useState(false);
  const [progressSummary, setProgressSummary] = useState<ProgressSummary | null>(null);
  const [preferences, setPreferences] = useState<CareerPreferences | null>(null);
  const [activities, setActivities] = useState<DashboardActivity[] | undefined>(undefined);
  const [matchedJobs, setMatchedJobs] = useState<MatchedJob[] | undefined>(undefined);
  const [salaryData, setSalaryData] = useState<SalaryInsightsData | null>(null);

  const fetchInitialData = useCallback(async () => {
    setIsLoadingInitial(true);
    const [cvResult, skillResult, prefsResult, activityResult] = await Promise.allSettled([
      cvService.getUserCVs(),
      skillGapService.getProgressSummary(),
      settingsService.getCareerPreferences(),
      dashboardService.getRecentActivity(),
    ]);

    if (cvResult.status === 'fulfilled') {
      const cvs = cvResult.value.data;
      setHasCv(cvs.length > 0);
      const primary = cvs.find(cv => cv.isPrimary) ?? cvs[0] ?? null;
      setPrimaryCv(primary);
    }

    if (skillResult.status === 'fulfilled') {
      setProgressSummary(skillResult.value.data);
    }

    if (prefsResult.status === 'fulfilled') {
      setPreferences(prefsResult.value);
    }

    if (activityResult.status === 'fulfilled') {
      setActivities(activityResult.value);
    }

    setIsLoadingInitial(false);
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (isAuthenticated) {
      fetchInitialData();
    }
  }, [authLoading, isAuthenticated, router, fetchInitialData]);

  useEffect(() => {
    if (isLoadingInitial || !preferences) return;

    const fetchSecondaryData = async () => {
      setIsLoadingSecondary(true);

      const secondaryPromises: Promise<void>[] = [];

      secondaryPromises.push(
        matchingService.findMatches(undefined, 3, undefined, 100)
          .then(response => {
            if (response.success) {
              setMatchedJobs(response.data.matched_jobs.slice(0, 3));
            }
          })
          .catch(() => { /* silently fail */ })
      );

      if (preferences.targetRole) {
        const region = preferences.region || 'London';
        const country = preferences.country || 'gb';
        secondaryPromises.push(
          salaryService.getInsights(preferences.targetRole, region, country)
            .then(response => {
              if (response.success) {
                setSalaryData(response.data);
              }
            })
            .catch(() => { /* silently fail */ })
        );
      }

      await Promise.allSettled(secondaryPromises);
      setIsLoadingSecondary(false);
    };

    fetchSecondaryData();
  }, [isLoadingInitial, preferences]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const cvScore = primaryCv?.overviewData?.overallScore ?? null;
  const cvIssues = primaryCv?.overviewData?.priorityIssues?.length ?? 0;
  const hasAnalysis = !!primaryCv?.overviewData;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.firstName || 'User'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s your career command center.
            {matchedJobs && matchedJobs.length > 0 && ` You have ${matchedJobs.length} top job matches.`}
          </p>
        </div>

        <QuickStats
          matchCount={matchedJobs?.length}
          skillsToLearn={progressSummary?.totalPaths}
          inProgressSkills={progressSummary?.inProgressPaths}
          isLoading={isLoadingInitial}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6">
            <CVHealthScore
              score={cvScore}
              issues={cvIssues}
              hasCv={hasCv}
              hasAnalysis={hasAnalysis}
              isLoading={isLoadingInitial}
            />
            <RecommendedActions
              cvData={primaryCv}
              skillData={progressSummary}
              preferences={preferences}
              matchCount={matchedJobs?.length}
            />
          </div>

          <div className="space-y-6 lg:col-span-2">
            <ApplicationChart />
            <ApplicationKanban />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <JobMatchPreview jobs={matchedJobs} isLoading={isLoadingSecondary && !matchedJobs} />
          <RecentActivity activities={activities} isLoading={isLoadingInitial} />
        </div>

        <MarketInsights
          preferences={preferences}
          salaryData={salaryData}
          isLoading={isLoadingSecondary && !salaryData}
        />
      </div>
    </AppLayout>
  );
}
