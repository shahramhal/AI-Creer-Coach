'use client';

import { useEffect, useState } from 'react';
import { adminService } from '@/services/admin.service';
import type { ServiceHealthStatus, CacheStats, QueueStatus, DatabaseStats } from '@/types/admin.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AdminSystemPage() {
  const [health, setHealth] = useState<ServiceHealthStatus | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus[]>([]);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [healthRes, cacheRes, queueRes, dbRes] = await Promise.all([
        adminService.getServiceHealth(),
        adminService.getCacheStats(),
        adminService.getQueueStatus(),
        adminService.getDatabaseStats(),
      ]);
      setHealth(healthRes.data.data);
      setCacheStats(cacheRes.data.data);
      setQueueStatus(queueRes.data.data);
      setDbStats(dbRes.data.data);
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
    } catch { /* keep previous state */ }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">System Monitoring</h1>
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const serviceLabels: Record<string, string> = {
    postgres: 'PostgreSQL',
    mongodb: 'MongoDB',
    redis: 'Redis',
    mlService: 'ML Service',
    jobApiService: 'Job API',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">System Monitoring</h1>

      <Tabs defaultValue="health">
        <TabsList>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="queues">Queues</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>

        {/* Health Tab */}
        <TabsContent value="health" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {health &&
              Object.entries(serviceLabels).map(([key, label]) => {
                const isHealthy = health[key as keyof ServiceHealthStatus];
                return (
                  <Card key={key}>
                    <CardContent className="p-4 text-center">
                      <div
                        className={`mx-auto h-4 w-4 rounded-full mb-3 ${
                          isHealthy ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      <p className="font-medium text-sm">{label}</p>
                      <Badge variant={isHealthy ? 'outline' : 'destructive'} className="mt-2">
                        {isHealthy ? 'Healthy' : 'Down'}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
          <p className="text-xs text-muted-foreground mt-4">Auto-refreshes every 30 seconds</p>
        </TabsContent>

        {/* Cache Tab */}
        <TabsContent value="cache" className="mt-4">
          {cacheStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Keys</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{cacheStats.keyCount.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Hit Rate</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {cacheStats.hitRate.hits + cacheStats.hitRate.misses > 0
                      ? `${Math.round(
                          (cacheStats.hitRate.hits / (cacheStats.hitRate.hits + cacheStats.hitRate.misses)) * 100
                        )}%`
                      : 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {cacheStats.hitRate.hits.toLocaleString()} hits / {cacheStats.hitRate.misses.toLocaleString()} misses
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Memory</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{cacheStats.memory.used}</p>
                  <p className="text-sm text-muted-foreground mt-1">Peak: {cacheStats.memory.peak}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Queues Tab */}
        <TabsContent value="queues" className="mt-4">
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
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="mt-4 space-y-6">
          {dbStats && (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">PostgreSQL Tables</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(dbStats.postgres).map(([table, count]) => (
                      <div key={table} className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">{count.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground capitalize">{table}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {dbStats.mongodb.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">MongoDB Collections</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {dbStats.mongodb.map((col) => (
                        <div key={col.name} className="text-center p-3 rounded-lg bg-muted/50">
                          <p className="text-2xl font-bold">{col.count.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{col.name}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
