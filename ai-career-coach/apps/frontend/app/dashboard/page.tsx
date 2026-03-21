'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import dynamic from 'next/dynamic';
import { AppLayout } from '@/components/layout/AppLayout';
import { CVHealthScore } from '@/components/dashboard/CVHealthScore';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { RecommendedActions } from '@/components/dashboard/RecommendedActions';
import { JobMatchPreview } from '@/components/dashboard/JobMatchPreview';
import {
  useUserCVs,
  useProgressSummary,
  useCareerPreferences,
  useRecentActivity,
  useJobMatches,
  useSalaryInsights,
} from '@/hooks/queries';
import { useEffect } from 'react';

const ApplicationChart = dynamic(
  () => import('@/components/dashboard/ApplicationChart').then((m) => m.ApplicationChart),
  { ssr: false },
);
const ApplicationKanban = dynamic(
  () => import('@/components/dashboard/ApplicationKanban').then((m) => m.ApplicationKanban),
  { ssr: false },
);
const MarketInsights = dynamic(
  () => import('@/components/dashboard/MarketInsights').then((m) => m.MarketInsights),
  { ssr: false },
);

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const isReady = isAuthenticated && !authLoading;

  const cvsQuery = useUserCVs(isReady);
  const progressQuery = useProgressSummary(isReady);
  const preferencesQuery = useCareerPreferences(isReady);
  const activityQuery = useRecentActivity(isReady);
  const matchesQuery = useJobMatches(100, isReady);

  const preferences = preferencesQuery.data;
  const salaryQuery = useSalaryInsights(
    preferences?.targetRole,
    preferences?.region,
    preferences?.country,
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const cvs = cvsQuery.data?.data ?? [];
  const primaryCv = cvs.find((cv) => cv.isPrimary) ?? cvs[0] ?? null;
  const hasCv = cvs.length > 0;
  const cvScore = primaryCv?.overviewData?.overallScore ?? null;
  const cvIssues = primaryCv?.overviewData?.priorityIssues?.length ?? 0;
  const hasAnalysis = !!primaryCv?.overviewData;

  const progressSummary = progressQuery.data?.data ?? null;
  const activities = activityQuery.data;
  const allMatchedJobs = matchesQuery.data?.success
    ? matchesQuery.data.data.matched_jobs
    : undefined;
  const topMatchedJobs = allMatchedJobs?.slice(0, 3);
  const strongMatchCount = allMatchedJobs?.filter((job) => job.match_score >= 55).length;
  const salaryData = salaryQuery.data?.success ? salaryQuery.data.data : null;

  const isLoadingInitial =
    cvsQuery.isLoading || progressQuery.isLoading || preferencesQuery.isLoading || activityQuery.isLoading;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.firstName || 'User'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s your career command center.
            {strongMatchCount !== undefined && strongMatchCount > 0 && ` You have ${strongMatchCount} strong job matches.`}
          </p>
        </div>

        <QuickStats
          matchCount={strongMatchCount}
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
              isLoading={cvsQuery.isLoading}
            />
            <RecommendedActions
              cvData={primaryCv}
              skillData={progressSummary}
              preferences={preferences ?? null}
              matchCount={strongMatchCount}
            />
          </div>

          <div className="space-y-6 lg:col-span-2">
            <ApplicationChart />
            <ApplicationKanban />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <JobMatchPreview
            jobs={topMatchedJobs}
            isLoading={matchesQuery.isLoading}
          />
          <RecentActivity
            activities={activities}
            isLoading={activityQuery.isLoading}
          />
        </div>

        {matchesQuery.isError && (
          <p className="text-sm text-muted-foreground">Job matching data unavailable right now.</p>
        )}

        <MarketInsights
          preferences={preferences ?? null}
          salaryData={salaryData}
          isLoading={salaryQuery.isLoading}
        />

        {salaryQuery.isError && preferences?.targetRole && (
          <p className="text-sm text-muted-foreground">Salary insights unavailable right now.</p>
        )}
      </div>
    </AppLayout>
  );
}
