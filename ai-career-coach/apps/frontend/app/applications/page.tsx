'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList,
  ExternalLink,
  Trash2,
  MapPin,
  Building2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/context/authContext';
import { useApplications, queryKeys } from '@/hooks/queries';
import { applicationService } from '@/services/application.service';
import type { ApplicationStatus } from '@/types/application.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; className: string }> = {
  applied: {
    label: 'Applied',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-transparent',
  },
  interview: {
    label: 'Interview',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-transparent',
  },
  offer: {
    label: 'Offer',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-transparent',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-transparent',
  },
};

export default function ApplicationsPage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filterValue = statusFilter === 'all' ? undefined : statusFilter;
  const applicationsQuery = useApplications(filterValue, isAuthenticated && !authLoading);

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
    router.push('/auth/login');
    return null;
  }

  const applications = applicationsQuery.data?.data ?? [];

  const handleStatusChange = async (applicationId: string, newStatus: ApplicationStatus) => {
    setErrorMessage(null);
    try {
      await applicationService.updateStatus(applicationId, newStatus);
      queryClient.invalidateQueries({ queryKey: queryKeys.applications() });
      queryClient.invalidateQueries({ queryKey: queryKeys.applicationStats });
    } catch {
      setErrorMessage('Failed to update status. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await applicationService.deleteApplication(deleteTarget);
      queryClient.invalidateQueries({ queryKey: queryKeys.applications() });
      queryClient.invalidateQueries({ queryKey: queryKeys.applicationStats });
    } catch {
      setErrorMessage('Failed to delete application. Please try again.');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Application Tracker</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track and manage your job applications.
            </p>
          </div>

          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as ApplicationStatus | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="interview">Interview</SelectItem>
              <SelectItem value="offer">Offer</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        <Card className="border-border bg-card shadow-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {applications.length} application{applications.length !== 1 ? 's' : ''}
              {statusFilter !== 'all' ? ` with status "${STATUS_CONFIG[statusFilter].label}"` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {applicationsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : applications.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <ClipboardList className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm font-medium text-foreground">No applications tracked yet</p>
                <p className="text-xs text-muted-foreground">
                  Apply for jobs in{' '}
                  <button
                    onClick={() => router.push('/jobs')}
                    className="text-primary hover:underline"
                  >
                    Job Matches
                  </button>{' '}
                  to start tracking.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Title</TableHead>
                    <TableHead className="hidden sm:table-cell">Company</TableHead>
                    <TableHead className="hidden md:table-cell">Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Date Applied</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div className="font-medium">{app.jobTitle}</div>
                        <div className="sm:hidden text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {app.company}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          {app.company}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {app.location ? (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {app.location}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={app.status}
                          onValueChange={(v) => handleStatusChange(app.id, v as ApplicationStatus)}
                        >
                          <SelectTrigger className="h-8 w-[130px] border-0 bg-transparent p-0 focus:ring-0">
                            <Badge variant="outline" className={STATUS_CONFIG[app.status].className}>
                              {STATUS_CONFIG[app.status].label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="applied">Applied</SelectItem>
                            <SelectItem value="interview">Interview</SelectItem>
                            <SelectItem value="offer">Offer</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {new Date(app.appliedDate).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {app.sourceUrl && /^https?:\/\//i.test(app.sourceUrl) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => window.open(app.sourceUrl!, '_blank', 'noopener,noreferrer')}
                              title="Open job listing"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(app.id)}
                            title="Delete application"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete application?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the application from your tracker.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
