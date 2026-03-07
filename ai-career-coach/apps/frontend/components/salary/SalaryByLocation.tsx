'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { RegionalSalary } from '../../types/salary.types';

interface SalaryByLocationProps {
  regions: RegionalSalary[];
  currency: string;
}

function formatAxisTick(value: number, currency: string): string {
  if (value >= 1000) return `${currency}${Math.round(value / 1000)}k`;
  return `${currency}${value}`;
}

export default function SalaryByLocation({ regions, currency }: SalaryByLocationProps) {
  if (regions.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-card">
        <h3 className="text-base font-semibold text-foreground mb-4">Salary by Cities</h3>
        <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
          No regional data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-card">
      <h3 className="text-base font-semibold text-foreground mb-4">Salary by Cities</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={regions} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <XAxis
              dataKey="location"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(value) => formatAxisTick(value, currency)}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number) => [`${currency}${value.toLocaleString()}`, 'Avg Salary']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
              }}
              itemStyle={{ color: '#6366f1' }}
              cursor={false}
            />
            <Bar dataKey="salary" radius={[6, 6, 0, 0]} barSize={80}>
              {regions.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`hsl(${230 + index * 8}, 70%, ${55 + index * 3}%)`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
