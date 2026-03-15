'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { JobMatchCard } from '@/components/jobs/JobMatchCard';
import { JobFilters } from '@/components/jobs/JobFilters';
import { JobMatchPagination } from '@/components/jobs/JobMatchPagination';
import { matchingService } from '@/services/matching.service';
import { cvService } from '@/services/cv.service';
import type { MatchedJob, MatchFilters, SortOption } from '@/types/matching.types';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, RefreshCw, Briefcase, AlertCircle, Upload, Clock, SearchX, ArrowUpDown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from "@/components/ui/card";
import axios from 'axios';

const JOBS_PER_PAGE = 20;

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'score_desc', label: 'Match Score (High to Low)' },
  { value: 'score_asc', label: 'Match Score (Low to High)' },
  { value: 'date_desc', label: 'Date Posted (Newest)' },
  { value: 'date_asc', label: 'Date Posted (Oldest)' },
  { value: 'salary_desc', label: 'Salary (High to Low)' },
  { value: 'salary_asc', label: 'Salary (Low to High)' },
];

type MatchingErrorCode = 'NO_CV' | 'NO_JOBS' | 'DB_CONNECTION_ERROR' | 'ML_SERVICE_ERROR' | 'AUTH_ERROR' | 'UNKNOWN_ERROR';

interface MatchingError {
  code: MatchingErrorCode;
  message: string;
  details?: Record<string, any>;
}

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

function sortJobs(jobsList: MatchedJob[], sortOption: SortOption): MatchedJob[] {
  const sorted = [...jobsList];
  switch (sortOption) {
    case 'score_desc':
      return sorted.sort((a, b) => b.match_score - a.match_score);
    case 'score_asc':
      return sorted.sort((a, b) => a.match_score - b.match_score);
    case 'date_desc':
      return sorted.sort((a, b) => {
        const dateA = a.posted_date ? new Date(a.posted_date).getTime() : -Infinity;
        const dateB = b.posted_date ? new Date(b.posted_date).getTime() : -Infinity;
        return dateB - dateA;
      });
    case 'date_asc':
      return sorted.sort((a, b) => {
        const dateA = a.posted_date ? new Date(a.posted_date).getTime() : Infinity;
        const dateB = b.posted_date ? new Date(b.posted_date).getTime() : Infinity;
        return dateA - dateB;
      });
    case 'salary_desc':
      return sorted.sort((a, b) => (b.salary_max ?? b.salary_min ?? 0) - (a.salary_max ?? a.salary_min ?? 0));
    case 'salary_asc':
      return sorted.sort((a, b) => (a.salary_min ?? a.salary_max ?? Infinity) - (b.salary_min ?? b.salary_max ?? Infinity));
    default:
      return sorted;
  }
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

  const [currentPage, setCurrentPage] = useState(1);
  const [sortOption, setSortOption] = useState<SortOption>('score_desc');
  const [minScore, setMinScore] = useState(0);

  const processedJobs = useMemo(() => {
    let filtered = jobs;
    if (minScore > 0) {
      filtered = jobs.filter((job) => job.match_score >= minScore);
    }
    return sortJobs(filtered, sortOption);
  }, [jobs, sortOption, minScore]);

  const totalPages = Math.ceil(processedJobs.length / JOBS_PER_PAGE);
  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * JOBS_PER_PAGE;
    return processedJobs.slice(startIndex, startIndex + JOBS_PER_PAGE);
  }, [processedJobs, currentPage]);

  const showingStart = processedJobs.length > 0 ? (currentPage - 1) * JOBS_PER_PAGE + 1 : 0;
  const showingEnd = Math.min(currentPage * JOBS_PER_PAGE, processedJobs.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortOption, minScore]);

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

          const cvLocation = parsedData.personal?.location;
          const inferredCountry = inferCountryFromLocation(cvLocation);
          if (inferredCountry) {
            defaultFilters.country = inferredCountry;
          }

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
      fetchMatches(defaultFilters);
    };

    populateDefaultsAndFetch();
  }, [isAuthenticated, filtersInitialised]);

  const fetchMatches = useCallback(async (overrideFilters?: MatchFilters) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);
    setCurrentPage(1);
    try {
      const activeFilters = overrideFilters ?? filters;
      const cleanedFilters: MatchFilters = {};
      for (const [key, value] of Object.entries(activeFilters)) {
        if (value !== undefined && value !== '' && value !== null) {
          (cleanedFilters as any)[key] = value;
        }
      }
      const filtersToSend = Object.keys(cleanedFilters).length > 0 ? cleanedFilters : undefined;
      const response = await matchingService.findMatches(filtersToSend, 100, abortControllerRef.current?.signal);
      setJobs(response.data.matched_jobs);
    } catch (err: unknown) {
      if (axios.isCancel(err) || (err instanceof DOMException && err.name === 'AbortError')) return;
      console.error('Error fetching job matches:', err);

      const rawResponseData = axios.isAxiosError(err) ? err.response?.data : undefined;
      const isApiError = rawResponseData && typeof rawResponseData === 'object' && rawResponseData.success === false;
      const backendCode: string | undefined = isApiError ? rawResponseData.code : undefined;
      const backendMessage: string | undefined = isApiError ? rawResponseData.message : undefined;

      const codeMap: Record<string, MatchingErrorCode> = {
        NOT_FOUND: 'NO_CV',
        NO_JOBS: 'NO_JOBS',
        ML_SERVICE_ERROR: 'ML_SERVICE_ERROR',
        INTERNAL_ERROR: 'UNKNOWN_ERROR',
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
          <div className="flex gap-2 mt-3">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setFilters({});
                fetchMatches({});
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Clear Filters & Retry
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMatches()}
            >
              <Clock className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
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

        <JobFilters
          filters={filters}
          onChange={setFilters}
          onApply={handleApplyFilters}
          isLoading={isLoading}
          minScore={minScore}
          onMinScoreChange={setMinScore}
        />

        {error && (
          <Alert
            variant={error.code === 'NO_CV' ? 'default' : error.code === 'NO_JOBS' ? 'warning' : 'destructive'}
            className="animate-in fade-in slide-in-from-top-2"
          >
            {error.code === 'NO_JOBS' ? <SearchX className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>
              {error.code === 'NO_CV' ? 'CV Required' :
               error.code === 'NO_JOBS' ? 'No Matching Jobs Found' :
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
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {showingStart}-{showingEnd} of {processedJobs.length} matches
                    {minScore > 0 && ` (filtered from ${jobs.length} total)`}
                  </p>
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Select
                      value={sortOption}
                      onValueChange={(value) => setSortOption(value as SortOption)}
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {processedJobs.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="rounded-full bg-muted p-4 mb-4">
                        <SearchX className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium">No jobs above {minScore}% match score</h3>
                      <p className="text-muted-foreground mt-2 max-w-sm">
                        Try lowering the minimum match score filter to see more results.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2">
                      {paginatedJobs.map((job) => (
                        <JobMatchCard key={job.job_id} job={job} />
                      ))}
                    </div>

                    <JobMatchPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
