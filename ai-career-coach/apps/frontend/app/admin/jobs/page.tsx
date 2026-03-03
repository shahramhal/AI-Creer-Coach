'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminService } from '@/services/admin.service';
import type { AdminJobListItem, JobStats, PaginationInfo } from '@/types/admin.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Briefcase, Download, Trash2, RefreshCw } from 'lucide-react';

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<AdminJobListItem[]>([]);
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Fetch form
  const [fetchCountry, setFetchCountry] = useState('us');
  const [fetchKeywords, setFetchKeywords] = useState('');
  const [fetchLoading, setFetchLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  // Delete
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const [jobsRes, statsRes] = await Promise.all([
        adminService.listJobs({ page, limit: 20 }),
        adminService.getJobStats(),
      ]);
      setJobs(jobsRes.data.data.jobs);
      setPagination(jobsRes.data.data.pagination);
      setJobStats(statsRes.data.data);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleFetchJobs = async () => {
    if (!fetchKeywords.trim()) return;
    setFetchLoading(true);
    try {
      await adminService.triggerJobFetch({ country: fetchCountry, keywords: fetchKeywords });
      setTimeout(loadJobs, 2000); // Reload after a short delay
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Job fetch failed');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleCleanup = async () => {
    setCleanupLoading(true);
    try {
      await adminService.triggerJobCleanup();
      loadJobs();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Cleanup failed');
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!deleteJobId) return;
    try {
      await adminService.deleteJob(deleteJobId);
      loadJobs();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Delete failed');
    } finally {
      setDeleteJobId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Job Management</h1>

      {/* Stats */}
      {jobStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Briefcase className="h-8 w-8 text-primary opacity-80" />
              <div>
                <p className="text-sm text-muted-foreground">Total Jobs</p>
                <p className="text-2xl font-bold">{jobStats.totalJobs.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-2">By Source</p>
              <div className="flex flex-wrap gap-1">
                {jobStats.bySource.map((s) => (
                  <Badge key={s.source} variant="secondary">
                    {s.source}: {s.count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-2">Top Countries</p>
              <div className="flex flex-wrap gap-1">
                {jobStats.byCountry.slice(0, 5).map((c) => (
                  <Badge key={c.country} variant="outline">
                    {c.country}: {c.count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2 flex-1">
            <Input
              placeholder="Keywords (e.g. React Developer)"
              value={fetchKeywords}
              onChange={(e) => setFetchKeywords(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Country"
              value={fetchCountry}
              onChange={(e) => setFetchCountry(e.target.value)}
              className="w-24"
            />
            <Button onClick={handleFetchJobs} disabled={fetchLoading || !fetchKeywords.trim()}>
              <Download className="mr-2 h-4 w-4" />
              {fetchLoading ? 'Fetching...' : 'Fetch'}
            </Button>
          </div>
          <Button variant="outline" onClick={handleCleanup} disabled={cleanupLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {cleanupLoading ? 'Cleaning...' : 'Clean Expired'}
          </Button>
        </CardContent>
      </Card>

      {/* Job List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : jobs.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Posted</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job._id}>
                <TableCell className="font-medium max-w-[200px] truncate">
                  {job.title || '-'}
                </TableCell>
                <TableCell>{job.company || '-'}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{job.source || '-'}</Badge>
                </TableCell>
                <TableCell>{job.country || '-'}</TableCell>
                <TableCell>
                  {job.created_at ? new Date(job.created_at).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteJobId(job._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-center py-8 text-muted-foreground">No jobs found</p>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteJobId} onOpenChange={(open) => !open && setDeleteJobId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this job listing. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteJob} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
