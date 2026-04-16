'use client';

import { useEffect, useState } from 'react';
import { adminService } from '@/services/admin.service';
import type {
  ServiceHealthStatus,
  CacheStats,
  QueueStatus,
  DatabaseStats,
  AuditLogEntry,
  ApiRouteMetric,
  WebVitalsData,
} from '@/types/admin.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Database,
  HardDrive,
  Server,
  Cpu,
  Radio,
  ChevronDown,
  Activity,
  Clock,
  Gauge,
  Globe,
} from 'lucide-react';

type ServiceKey = 'postgres' | 'mongodb' | 'redis' | 'mlService' | 'jobApiService';

const SERVICE_CONFIG: Record<ServiceKey, { label: string; icon: typeof Database }> = {
  postgres: { label: 'PostgreSQL', icon: Database },
  mongodb: { label: 'MongoDB', icon: HardDrive },
  redis: { label: 'Redis', icon: Radio },
  mlService: { label: 'ML Service', icon: Cpu },
  jobApiService: { label: 'Job API', icon: Server },
};

export default function AdminSystemPage() {
  const [health, setHealth] = useState<ServiceHealthStatus | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus[]>([]);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [apiMetrics, setApiMetrics] = useState<ApiRouteMetric[]>([]);
  const [webVitals, setWebVitals] = useState<WebVitalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedService, setExpandedService] = useState<ServiceKey | null>(null);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [healthRes, cacheRes, queueRes, dbRes, auditRes, metricsRes, vitalsRes] = await Promise.all([
        adminService.getServiceHealth(),
        adminService.getCacheStats(),
        adminService.getQueueStatus(),
        adminService.getDatabaseStats(),
        adminService.getAuditLogs({ page: 1, limit: 10 }),
        adminService.getApiMetrics(),
        adminService.getWebVitals(),
      ]);
      setHealth(healthRes.data.data);
      setCacheStats(cacheRes.data.data);
      setQueueStatus(queueRes.data.data);
      setDbStats(dbRes.data.data);
      setAuditLogs(auditRes.data.data.logs);
      setApiMetrics(metricsRes.data.data);
      setWebVitals(vitalsRes.data.data);
    } catch (error) {
      console.error('Failed to load system data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHealth = async () => {
    try {
      const response = await adminService.getServiceHealth();
      setHealth(response.data.data);
    } catch {
      /* keep previous state */
    }
  };

  const toggleService = (key: ServiceKey) => {
    setExpandedService((prev) => (prev === key ? null : key));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">System Monitoring</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const cacheHitPercent =
    cacheStats && cacheStats.hitRate.hits + cacheStats.hitRate.misses > 0
      ? Math.round(
          (cacheStats.hitRate.hits / (cacheStats.hitRate.hits + cacheStats.hitRate.misses)) * 100
        )
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">System Monitoring</h1>
        <p className="text-xs text-muted-foreground">Auto-refreshes every 30s</p>
      </div>

      {/*  Service Health Cards  */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {health &&
          (Object.keys(SERVICE_CONFIG) as ServiceKey[]).map((key) => {
            const { label, icon: Icon } = SERVICE_CONFIG[key];
            const isHealthy = health[key as keyof ServiceHealthStatus] as boolean;
            const isExpanded = expandedService === key;
            const hasDetail = key === 'postgres' || key === 'mongodb' || key === 'redis';

            return (
              <Card
                key={key}
                className={`transition-all ${hasDetail ? 'cursor-pointer hover:border-primary/50' : ''} ${
                  isExpanded ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => hasDetail && toggleService(key)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div className="flex items-center gap-1">
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${
                          isHealthy ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      {hasDetail && (
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      )}
                    </div>
                  </div>
                  <p className="font-medium text-sm">{label}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={isHealthy ? 'outline' : 'destructive'} className="text-xs">
                      {isHealthy ? 'Healthy' : 'Down'}
                    </Badge>
                    {key === 'mlService' && health.mlServiceResponseMs != null && (
                      <span className="text-xs text-muted-foreground">
                        {health.mlServiceResponseMs}ms
                      </span>
                    )}
                    {key === 'jobApiService' && health.jobApiResponseMs != null && (
                      <span className="text-xs text-muted-foreground">
                        {health.jobApiResponseMs}ms
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/*  Expanded Detail Panel  */}
      {expandedService === 'postgres' && dbStats && (
        <Card className="animate-in slide-in-from-top-2 duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              PostgreSQL Tables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(dbStats.postgres).map(([table, count]) => (
                <div key={table} className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{count.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground capitalize">{table}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {expandedService === 'mongodb' && dbStats && (
        <Card className="animate-in slide-in-from-top-2 duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              MongoDB Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dbStats.mongodb.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {dbStats.mongodb.map((col) => (
                  <div key={col.name} className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{col.count.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{col.name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No collections found</p>
            )}
          </CardContent>
        </Card>
      )}

      {expandedService === 'redis' && cacheStats && (
        <Card className="animate-in slide-in-from-top-2 duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Redis Cache Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-3xl font-bold">{cacheStats.keyCount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Cached Keys</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-3xl font-bold">{cacheHitPercent != null ? `${cacheHitPercent}%` : 'N/A'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Hit Rate ({cacheStats.hitRate.hits.toLocaleString()} / {cacheStats.hitRate.misses.toLocaleString()})
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-3xl font-bold">{cacheStats.memory.used}</p>
                <p className="text-xs text-muted-foreground mt-1">Memory (Peak: {cacheStats.memory.peak})</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/*  Queue Status  */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Queue Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {queueStatus.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Queue</TableHead>
                  <TableHead>Waiting</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueStatus.map((queue) => (
                  <TableRow key={queue.name}>
                    <TableCell className="font-medium">{queue.name}</TableCell>
                    <TableCell>{queue.waiting}</TableCell>
                    <TableCell>{queue.active}</TableCell>
                    <TableCell>{queue.completed.toLocaleString()}</TableCell>
                    <TableCell className={queue.failed > 0 ? 'text-destructive font-medium' : ''}>
                      {queue.failed}
                    </TableCell>
                    <TableCell>
                      {queue.error ? (
                        <Badge variant="destructive">Error</Badge>
                      ) : queue.active > 0 ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="outline">Idle</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No queues configured</p>
          )}
        </CardContent>
      </Card>

      {/*  API Response Times  */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            API Response Times
          </CardTitle>
        </CardHeader>
        <CardContent>
          {apiMetrics.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Avg</TableHead>
                  <TableHead>p50</TableHead>
                  <TableHead>p95</TableHead>
                  <TableHead>p99</TableHead>
                  <TableHead>Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiMetrics.map((m) => (
                  <TableRow key={`${m.method}:${m.route}`}>
                    <TableCell className="font-mono text-xs">{m.route}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {m.method}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{m.count.toLocaleString()}</TableCell>
                    <TableCell className={`text-sm font-medium ${m.avg > 1000 ? 'text-destructive' : m.avg > 500 ? 'text-yellow-600' : ''}`}>
                      {m.avg}ms
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.p50}ms</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.p95}ms</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.p99}ms</TableCell>
                    <TableCell className={`text-sm ${m.errorRate > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {m.errorRate}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No data yet - metrics are collected as requests come in
            </p>
          )}
        </CardContent>
      </Card>

      {/*  Page Load Times (Web Vitals)  */}
      {webVitals && webVitals.sampleCount > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Page Load Times
              <span className="text-xs font-normal text-muted-foreground">
                ({webVitals.sampleCount.toLocaleString()} samples, last 7 days)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {webVitals.metrics.map((v) => (
                <div key={v.name} className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{v.avg}{v.name === 'CLS' ? '' : 'ms'}</p>
                  <p className="text-xs font-semibold mt-1">{v.name}</p>
                  <p className="text-xs text-muted-foreground">
                    p75: {v.p75}{v.name === 'CLS' ? '' : 'ms'} / p95: {v.p95}{v.name === 'CLS' ? '' : 'ms'}
                  </p>
                  <p className="text-xs text-muted-foreground">{v.count} samples</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/*  Recent Activity  */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Admin Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.admin.firstName || log.admin.email}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.targetType}
                      {log.targetId ? ` #${log.targetId.slice(0, 8)}` : ''}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
