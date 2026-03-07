'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminService } from '@/services/admin.service';
import type { AdminUserDetail } from '@/types/admin.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { ArrowLeft, Ban, CheckCircle, ShieldCheck, ShieldOff, KeyRound, Trash2 } from 'lucide-react';

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = async () => {
    try {
      const response = await adminService.getUserDetail(userId);
      setUser(response.data.data);
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      switch (confirmAction) {
        case 'disable':
          await adminService.toggleUserStatus(user.id, true);
          break;
        case 'enable':
          await adminService.toggleUserStatus(user.id, false);
          break;
        case 'promote':
          await adminService.promoteUser(user.id);
          break;
        case 'demote':
          await adminService.demoteUser(user.id);
          break;
        case 'resetPassword':
          const res = await adminService.forceResetPassword(user.id);
          alert(`Reset token: ${res.data.data.resetToken}`);
          break;
        case 'delete':
          await adminService.deleteUser(user.id);
          router.push('/admin/users');
          return;
      }
      loadUser();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">User not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/admin/users')}>
          Back to Users
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/users')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {user.firstName || user.lastName
              ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
              : user.email}
          </h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>{user.role}</Badge>
          {user.isDisabled ? (
            <Badge variant="destructive">Disabled</Badge>
          ) : (
            <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-2">
          {user.isDisabled ? (
            <Button variant="outline" size="sm" onClick={() => setConfirmAction('enable')}>
              <CheckCircle className="mr-2 h-4 w-4" /> Enable
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setConfirmAction('disable')}>
              <Ban className="mr-2 h-4 w-4" /> Disable
            </Button>
          )}
          {user.role === 'USER' ? (
            <Button variant="outline" size="sm" onClick={() => setConfirmAction('promote')}>
              <ShieldCheck className="mr-2 h-4 w-4" /> Promote
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setConfirmAction('demote')}>
              <ShieldOff className="mr-2 h-4 w-4" /> Demote
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setConfirmAction('resetPassword')}>
            <KeyRound className="mr-2 h-4 w-4" /> Reset Password
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setConfirmAction('delete')}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cvs">CVs ({user._count.cvs})</TabsTrigger>
          <TabsTrigger value="applications">Applications ({user._count.applications})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Account Info</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Email Verified</span><span>{user.isEmailVerified ? 'Yes' : 'No'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Last Login</span><span>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Joined</span><span>{new Date(user.createdAt).toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Updated</span><span>{new Date(user.updatedAt).toLocaleDateString()}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Activity Summary</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">CVs Uploaded</span><span>{user._count.cvs}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Applications</span><span>{user._count.applications}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Saved Jobs</span><span>{user._count.savedJobs}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Interview Sessions</span><span>{user._count.interviewSessions}</span></div>
              </CardContent>
            </Card>
            {user.profile && (
              <Card className="md:col-span-2">
                <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {user.profile.jobTitle && <div className="flex justify-between"><span className="text-muted-foreground">Job Title</span><span>{user.profile.jobTitle}</span></div>}
                  {user.profile.location && <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span>{user.profile.location}</span></div>}
                  {user.profile.phoneNumber && <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{user.profile.phoneNumber}</span></div>}
                  {user.profile.bio && <div><span className="text-muted-foreground">Bio:</span><p className="mt-1">{user.profile.bio}</p></div>}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cvs" className="mt-4">
          {user.cvs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Primary</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.cvs.map((cv) => (
                  <TableRow key={cv.id}>
                    <TableCell className="font-medium">{cv.filename}</TableCell>
                    <TableCell>{cv.isPrimary ? <Badge>Primary</Badge> : '-'}</TableCell>
                    <TableCell>{new Date(cv.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No CVs uploaded</p>
          )}
        </TabsContent>

        <TabsContent value="applications" className="mt-4">
          {user.applications.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>ATS Score</TableHead>
                  <TableHead>Applied</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.company}</TableCell>
                    <TableCell>{app.jobTitle}</TableCell>
                    <TableCell><Badge variant="outline">{app.status}</Badge></TableCell>
                    <TableCell>{app.atsScore ?? '-'}</TableCell>
                    <TableCell>{new Date(app.appliedDate).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No applications</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmation dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'delete' ? 'Delete User' :
               confirmAction === 'disable' ? 'Disable User' :
               confirmAction === 'enable' ? 'Enable User' :
               confirmAction === 'promote' ? 'Promote to Admin' :
               confirmAction === 'demote' ? 'Demote to User' :
               'Reset Password'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'delete'
                ? `This will permanently delete ${user.email} and all their data. This cannot be undone.`
                : `Are you sure you want to perform this action on ${user.email}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeAction}
              disabled={actionLoading}
              className={confirmAction === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {actionLoading ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
