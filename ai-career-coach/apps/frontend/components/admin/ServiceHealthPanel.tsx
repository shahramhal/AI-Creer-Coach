'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminService } from '@/services/admin.service';
import type { ServiceHealthStatus } from '@/types/admin.types';

const serviceLabels: Record<string, string> = {
  postgres: 'PostgreSQL',
  mongodb: 'MongoDB',
  redis: 'Redis',
  mlService: 'ML Service',
  jobApiService: 'Job API',
};

export function ServiceHealthPanel() {
  const [health, setHealth] = useState<ServiceHealthStatus | null>(null);

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadHealth = async () => {
    try {
      const response = await adminService.getServiceHealth();
      setHealth(response.data.data);
    } catch {
      // keep previous state on error
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Service Health</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          {health ? (
            Object.entries(serviceLabels).map(([key, label]) => {
              const isHealthy = health[key as keyof ServiceHealthStatus];
              return (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      isHealthy ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <span className="text-sm font-medium">{label}</span>
                  <span className={`text-xs ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
                    {isHealthy ? 'Healthy' : 'Down'}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="text-sm text-muted-foreground">Loading health status...</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
