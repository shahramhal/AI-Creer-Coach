'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { JobMatchCard } from '@/components/jobs/JobMatchCard'; // Ensure this path is correct
import { matchingService } from '@/services/matching.service';
import type { MatchedJob } from '@/types/matching.types';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Briefcase, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function JobMatchesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  
  const [jobs, setJobs] = useState<MatchedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    } else if (isAuthenticated) {
      fetchMatches();
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchMatches = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await matchingService.findMatches();
      setJobs(response.data.matched_jobs);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch job matches');
    } finally {
      setIsLoading(false);
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
          <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>{error}</p>
              {error.includes('No CV') && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-fit mt-2 border-destructive/50 hover:bg-destructive/10"
                  onClick={() => router.push('/cvs')}
                >
                  Upload CV
                </Button>
              )}
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