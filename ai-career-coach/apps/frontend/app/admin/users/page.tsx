'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { adminService } from '@/services/admin.service';
import type { AdminUser, PaginationInfo } from '@/types/admin.types';
import { UserTable } from '@/components/admin/UserTable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const initialLoad = useRef(true);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      if (!initialLoad.current) {
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch users when filters change
  useEffect(() => {
    initialLoad.current = false;
    loadUsers();
  }, [page, debouncedSearch, roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await adminService.listUsers({
        page,
        limit: 20,
        search: debouncedSearch || undefined,
        role: roleFilter || undefined,
      });
      setUsers(response.data.data.users);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterChips = [
    { label: 'All', value: '' },
    { label: 'Admins', value: 'ADMIN' },
    { label: 'Disabled', value: 'disabled' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">User Management</h1>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {filterChips.map((chip) => (
            <Badge
              key={chip.value}
              variant={roleFilter === chip.value ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => {
                setRoleFilter(chip.value);
                setPage(1);
              }}
            >
              {chip.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* User Table */}
      <UserTable
        users={users}
        loading={loading}
        onRowClick={(userId) => router.push(`/admin/users/${userId}`)}
        onRefresh={loadUsers}
      />

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
