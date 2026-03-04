'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { JobMatchCard } from '@/components/jobs/JobMatchCard';
import { JobFilters } from '@/components/jobs/JobFilters';
import { matchingService } from '@/services/matching.service';
import { cvService } from '@/services/cv.service';
import type { MatchedJob, MatchFilters } from '@/types/matching.types';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Briefcase, AlertCircle, Upload, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from "@/components/ui/card";
import axios from 'axios';

// Error codes from backend
type MatchingErrorCode = 'NO_CV' | 'NO_JOBS' | 'DB_CONNECTION_ERROR' | 'ML_SERVICE_ERROR' | 'AUTH_ERROR' | 'UNKNOWN_ERROR';

interface MatchingError {
  code: MatchingErrorCode;
  message: string;
  details?: Record<string, any>;
}

/** Try to infer a country code from a free-text location string. */
function inferCountryFromLocation(location?: string): string {
  if (!location) return '';
  const locationLower = location.toLowerCase();

  const countryPatterns: Record<string, string[]> = {
    gb: ['uk', 'united kingdom', 'england', 'london', 'manchester', 'birmingham', 'scotland', 'wales'],
    us: ['usa', 'united states', 'new york', 'california', 'san francisco', 'seattle', 'austin', 'chicago'],
    ca: ['canada', 'toronto', 'vancouver', 'montreal', 'ottawa'],
    de: ['germany', 'berlin', 'munich', 'hamburg', 'frankfurt'],
    fr: ['france', 'paris', 'lyon', 'marseille'],
    au: ['australia', 'sydney', 'melbourne', 'brisbane'],
    nl: ['netherlands', 'amsterdam', 'rotterdam'],
    in: ['india', 'bangalore', 'mumbai', 'delhi', 'hyderabad'],
    sg: ['singapore'],
  };

  for (const [code, patterns] of Object.entries(countryPatterns)) {
    if (patterns.some((pattern) => locationLower.includes(pattern))) {
      return code;
    }
  }
  return '';
}

export default function JobMatchesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [jobs, setJobs] = useState<MatchedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<MatchingError | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [filters, setFilters] = useState<MatchFilters>({});
  const [filtersInitialised, setFiltersInitialised] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-populate filter defaults from the user's primary CV, then trigger initial fetch
  useEffect(() => {
    if (!isAuthenticated || filtersInitialised) return;

    const populateDefaultsAndFetch = async () => {
      let defaultFilters: MatchFilters = {};

      try {
        const response = await cvService.getUserCVs();
        const cvList = response.data ?? [];
        const primaryCV = cvList.find((cv) => cv.isPrimary) ?? cvList[0];

        if (primaryCV?.parsedData) {
          const parsedData = primaryCV.parsedData;

          // Infer country from CV location
          const cvLocation = parsedData.personal?.location;
          const inferredCountry = inferCountryFromLocation(cvLocation);
          if (inferredCountry) {
            defaultFilters.country = inferredCountry;
          }

          // Pre-fill title from most recent experience
          const latestExperienceTitle = parsedData.experience?.[0]?.title;
          if (latestExperienceTitle) {
            defaultFilters.title_keywords = latestExperienceTitle;
          }
        }
      } catch {
        // Silently ignore — filters stay empty
      }

      if (Object.keys(defaultFilters).length > 0) {
        setFilters(defaultFilters);
      }
      setFiltersInitialised(true);
      setHasFetched(true);
      // Pass defaultFilters directly to bypass stale closure on `filters` state
      fetchMatches(defaultFilters);
    };

    populateDefaultsAndFetch();
  }, [isAuthenticated, filtersInitialised]);

  const fetchMatches = useCallback(async (overrideFilters?: MatchFilters) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);
    try {
      const activeFilters = overrideFilters ?? filters;
      // Only send non-empty filter values
      const cleanedFilters: MatchFilters = {};
      for (const [key, value] of Object.entries(activeFilters)) {
        if (value !== undefined && value !== '' && value !== null) {
          (cleanedFilters as any)[key] = value;
        }
      }
      const filtersToSend = Object.keys(cleanedFilters).length > 0 ? cleanedFilters : undefined;
      const response = await matchingService.findMatches(filtersToSend);
      setJobs(response.data.matched_jobs);
    } catch (err: unknown) {
      // Ignore cancelled requests
      if (axios.isCancel(err)) return;
      console.error('Error fetching job matches:', err);

      const rawResponseData = axios.isAxiosError(err) ? err.response?.data : undefined;
      const isApiError = rawResponseData && typeof rawResponseData === 'object' && rawResponseData.success === false;
      const backendCode: string | undefined = isApiError ? rawResponseData.code : undefined;
      const backendMessage: string | undefined = isApiError ? rawResponseData.message : undefined;

      const codeMap: Record<string, MatchingErrorCode> = {
        NOT_FOUND: 'NO_CV',
        ML_SERVICE_ERROR: 'ML_SERVICE_ERROR',
        INTERNAL_ERROR: 'DB_CONNECTION_ERROR',
      };
      const mappedCode: MatchingErrorCode = (backendCode && codeMap[backendCode]) || 'UNKNOWN_ERROR';

      const friendlyMessages: Record<MatchingErrorCode, string> = {
        NO_CV: 'No CV found for your account. Please upload your CV first to get personalised job matches.',
        NO_JOBS: 'No jobs are currently in the database. Check back soon — new listings are added daily.',
        ML_SERVICE_ERROR: 'The matching service is temporarily unavailable. Please try again in a moment.',
        DB_CONNECTION_ERROR: 'A database error occurred. Please retry in a few seconds.',
        AUTH_ERROR: 'Your session has expired. Please log in again.',
        UNKNOWN_ERROR: 'An unexpected error occurred while fetching job matches. Please try again.',
      };

      setError({
        code: mappedCode,
        message: backendMessage || friendlyMessages[mappedCode],
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Redirect unauthenticated users; cleanup on unmount
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [authLoading, isAuthenticated, router]);

  const handleApplyFilters = () => {
    fetchMatches();
  };

  // Helper to render error-specific UI
  const renderErrorAction = () => {
    if (!error) return null;

    switch (error.code) {
      case 'NO_CV':
        return (
          <Button
            variant="default"
            size="sm"
            className="mt-3"
            onClick={() => router.push('/cvs')}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Your CV
          </Button>
        );
      case 'NO_JOBS':
        return (
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => fetchMatches()}
          >
            <Clock className="mr-2 h-4 w-4" />
            Check Again
          </Button>
        );
      case 'ML_SERVICE_ERROR':
      case 'DB_CONNECTION_ERROR':
        return (
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => fetchMatches()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        );
      default:
        return (
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => fetchMatches()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        );
    }
  };

  if (authLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header Section */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Job Matches</h1>
            <p className="text-muted-foreground mt-1">
              AI-curated opportunities based on your CV profile
            </p>
          </div>
          <Button onClick={() => fetchMatches()} disabled={isLoading} className="w-fit">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh Matches
          </Button>
        </div>

        {/* Filter Panel */}
        <JobFilters
          filters={filters}
          onChange={setFilters}
          onApply={handleApplyFilters}
          isLoading={isLoading}
        />

        {/* Error State */}
        {error && (
          <Alert
            variant={error.code === 'NO_CV' ? 'default' : 'destructive'}
            className="animate-in fade-in slide-in-from-top-2"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {error.code === 'NO_CV' ? 'CV Required' :
               error.code === 'NO_JOBS' ? 'No Jobs Available' :
               error.code === 'ML_SERVICE_ERROR' ? 'Matching Service Unavailable' :
               error.code === 'DB_CONNECTION_ERROR' ? 'Database Error' :
               error.code === 'AUTH_ERROR' ? 'Session Expired' :
               'Something Went Wrong'}
            </AlertTitle>
            <AlertDescription className="flex flex-col">
              <p>{error.message}</p>
              {renderErrorAction()}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading Skeletons */}
        {isLoading && !error && (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="h-48 bg-muted animate-pulse" />
                <div className="p-6 space-y-3">
                  <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
                  <div className="space-y-2 pt-4">
                    <div className="h-3 w-full bg-muted animate-pulse rounded" />
                    <div className="h-3 w-5/6 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Results Grid */}
        {!isLoading && !error && (
          <>
            {jobs.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Briefcase className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">No matches found yet</h3>
                  <p className="text-muted-foreground mt-2 max-w-sm">
                    We couldn't find any jobs matching your specific criteria right now. Try updating your CV or adjusting the filters above.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2">
                {jobs.map((job) => (
                  <JobMatchCard key={job.job_id} job={job} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
