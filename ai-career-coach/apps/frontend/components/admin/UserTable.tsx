'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserActions } from '@/components/admin/UserActions';
import type { AdminUser } from '@/types/admin.types';

interface Props {
  users: AdminUser[];
  loading: boolean;
  onRowClick: (userId: string) => void;
  onRefresh: () => void;
}

export function UserTable({ users, loading, onRowClick, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No users found
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>CVs</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead className="w-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow
            key={user.id}
            className="cursor-pointer"
            onClick={() => onRowClick(user.id)}
          >
            <TableCell className="font-medium">
              {user.firstName || user.lastName
                ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
                : '-'}
            </TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                {user.role}
              </Badge>
            </TableCell>
            <TableCell>
              {user.isDisabled ? (
                <Badge variant="destructive">Disabled</Badge>
              ) : (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Active
                </Badge>
              )}
            </TableCell>
            <TableCell>{user._count.cvs}</TableCell>
            <TableCell>
              {new Date(user.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
              <UserActions user={user} onActionComplete={onRefresh} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
