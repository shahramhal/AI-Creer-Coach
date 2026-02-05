'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { JobMatchCard } from '@/components/jobs/JobMatchCard';
import { matchingService } from '@/services/matching.service';
import type { MatchedJob } from '@/types/matching.types';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Briefcase, AlertCircle, Upload, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from "@/components/ui/card";

// Error codes from backend
type MatchingErrorCode = 'NO_CV' | 'NO_JOBS' | 'DB_CONNECTION_ERROR' | 'ML_SERVICE_ERROR' | 'AUTH_ERROR' | 'UNKNOWN_ERROR';

interface MatchingError {
  code: MatchingErrorCode;
  message: string;
  details?: Record<string, any>;
}

export default function JobMatchesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [jobs, setJobs] = useState<MatchedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<MatchingError | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchMatches = useCallback(async () => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);
    try {
      const response = await matchingService.findMatches();
      setJobs(response.data.matched_jobs);
    } catch (err: any) {
      // Ignore cancelled requests
      if (err.name === 'CanceledError' || err.message === 'canceled') {
        return;
      }
      console.error('Error fetching job matches:', err);

      // Extract error from axios response
      const apiError = err.response?.data?.error;
      if (apiError && apiError.code) {
        setError({
          code: apiError.code,
          message: apiError.message,
          details: apiError.details
        });
      } else {
        setError({
          code: 'UNKNOWN_ERROR',
          message: err.message || 'An unexpected error occurred while fetching job matches.'
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    } else if (isAuthenticated && !hasFetched) {
      setHasFetched(true);
      fetchMatches();
    }

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [authLoading, isAuthenticated, router, hasFetched, fetchMatches]);

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
            onClick={fetchMatches}
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
            onClick={fetchMatches}
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
            onClick={fetchMatches}
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
          <Button onClick={fetchMatches} disabled={isLoading} className="w-fit">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh Matches
          </Button>
        </div>

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
               error.code === 'ML_SERVICE_ERROR' ? 'Service Unavailable' :
               'Error'}
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
                    We couldn't find any jobs matching your specific criteria right now. Try updating your CV or checking back later.
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