'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { MarketTrendPoint } from '../../types/salary.types';

interface MarketSalaryTrendProps {
  trend: MarketTrendPoint[];
  currency: string;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonthLabel(monthKey: string): string {
  // Input format: "2025-03"
  const parts = monthKey.split('-');
  if (parts.length !== 2) return monthKey;
  const monthIndex = parseInt(parts[1], 10) - 1;
  const yearShort = parts[0].slice(2);
  return `${MONTH_NAMES[monthIndex] || parts[1]} '${yearShort}`;
}

function formatAxisTick(value: number, currency: string): string {
  if (value >= 1000) return `${currency}${Math.round(value / 1000)}k`;
  return `${currency}${value}`;
}

export default function MarketSalaryTrend({ trend, currency }: MarketSalaryTrendProps) {
  if (trend.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-card">
        <h3 className="text-base font-semibold text-foreground mb-4">Market Salary Trend</h3>
        <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
          No historical data available
        </div>
      </div>
    );
  }

  // Format data for display
  const chartData = trend.map(point => ({
    ...point,
    label: formatMonthLabel(point.year),
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-card">
      <h3 className="text-base font-semibold text-foreground mb-1">Market Salary Trend</h3>
      <p className="text-xs text-muted-foreground mb-4">Last 12 months average salary</p>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="salaryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={1}
            />
            <YAxis
              tickFormatter={(value) => formatAxisTick(value, currency)}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              domain={['dataMin - 5000', 'dataMax + 5000']}
            />
            <Tooltip
              formatter={(value: number) => [`${currency}${value.toLocaleString()}`, 'Avg Salary']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
              }}
            />
            <Area
              type="monotone"
              dataKey="salary"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#salaryGradient)"
              dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
