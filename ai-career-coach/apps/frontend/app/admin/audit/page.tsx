'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { adminService } from '@/services/admin.service';
import type { AuditLogEntry, PaginationInfo } from '@/types/admin.types';
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
import { ChevronDown, ChevronRight } from 'lucide-react';

const actionTypes = [
  'USER_DISABLED',
  'USER_ENABLED',
  'USER_PROMOTED',
  'USER_DEMOTED',
  'USER_DELETED',
  'FORCE_PASSWORD_RESET',
  'JOB_FETCH_TRIGGERED',
  'JOB_CLEANUP_TRIGGERED',
  'JOB_DELETED',
];

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminService.getAuditLogs({
        page,
        limit: 20,
        action: actionFilter || undefined,
      });
      setLogs(response.data.data.logs);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const getActionColor = (action: string) => {
    if (action.includes('DELETE')) return 'destructive';
    if (action.includes('DISABLE')) return 'destructive';
    if (action.includes('PROMOTE')) return 'default';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Audit Log</h1>

      {/* Filter */}
      <div className="flex gap-4">
        <Select
          value={actionFilter}
          onValueChange={(value) => {
            setActionFilter(value === 'all' ? '' : value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actionTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Log Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : logs.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <React.Fragment key={log.id}>
                <TableRow
                  className="cursor-pointer"
                  onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                >
                  <TableCell>
                    {log.details ? (
                      expandedRow === log.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.admin.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionColor(log.action) as any}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.targetType}
                    {log.targetId && (
                      <span className="text-muted-foreground ml-1">
                        ({log.targetId.substring(0, 8)}...)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.ipAddress || '-'}
                  </TableCell>
                </TableRow>
                {expandedRow === log.id && log.details && (
                  <TableRow key={`${log.id}-details`}>
                    <TableCell colSpan={6} className="bg-muted/50">
                      <pre className="text-xs whitespace-pre-wrap p-2 font-mono">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-center py-8 text-muted-foreground">No audit logs found</p>
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
    </div>
  );
}
