import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import type { ApplicationStats } from "@/types/application.types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ApplicationChartProps {
  stats?: ApplicationStats;
  isLoading?: boolean;
}

const BAR_COLORS: Record<string, string> = {
  Applied: '#3b82f6',
  Interview: '#eab308',
  Offer: '#22c55e',
  Rejected: '#ef4444',
};

export function ApplicationChart({ stats, isLoading }: ApplicationChartProps) {
  const hasData = stats && stats.total > 0;

  const chartData = stats
    ? [
        { name: 'Applied', count: stats.byStatus.applied },
        { name: 'Interview', count: stats.byStatus.interview },
        { name: 'Offer', count: stats.byStatus.offer },
        { name: 'Rejected', count: stats.byStatus.rejected },
      ]
    : [];

  return (
    <Card className="border-border bg-card shadow-card">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Application Funnel
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">No applications yet</p>
            <p className="text-xs text-muted-foreground">Track your applications to see conversion rates</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                itemStyle={{ color: '#6366f1' }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={BAR_COLORS[entry.name]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
