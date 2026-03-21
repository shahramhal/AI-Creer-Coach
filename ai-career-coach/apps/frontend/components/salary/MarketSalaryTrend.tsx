'use client';

import { useState, useMemo } from 'react';
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

function getAvailableYears(trend: MarketTrendPoint[]): string[] {
  const yearsSet = new Set<string>();
  for (const point of trend) {
    const year = point.year.split('-')[0];
    if (year) yearsSet.add(year);
  }
  return Array.from(yearsSet).sort();
}

export default function MarketSalaryTrend({ trend, currency }: MarketSalaryTrendProps) {
  const availableYears = useMemo(() => getAvailableYears(trend), [trend]);
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState<string>('all');

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

  const filteredTrend = selectedYear === 'all'
    ? trend
    : trend.filter(point => point.year.startsWith(selectedYear));

  const chartData = filteredTrend.map(point => ({
    ...point,
    label: formatMonthLabel(point.year),
  }));

  const selectClassName = "rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-card">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold text-foreground">Market Salary Trend</h3>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className={selectClassName}
        >
          <option value="all">All years</option>
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Historical salary trend</p>
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
              interval={selectedYear === 'all' ? 2 : 0}
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
