'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { JobStats } from '@/types/admin.types';

interface Props {
  data: JobStats;
}

export function JobDistributionChart({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Jobs by Source</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {data.bySource.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.bySource}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="source" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Jobs" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No job data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
