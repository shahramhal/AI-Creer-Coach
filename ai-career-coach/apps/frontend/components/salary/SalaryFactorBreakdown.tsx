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
import type { SalaryFactor } from '../../types/salary.types';

interface SalaryFactorBreakdownProps {
  factors: SalaryFactor[];
  currency: string;
}

function formatAxisTick(value: number, currency: string): string {
  if (value >= 1000) return `${currency}${Math.round(value / 1000)}k`;
  return `${currency}${value}`;
}

export default function SalaryFactorBreakdown({ factors, currency }: SalaryFactorBreakdownProps) {
  // Reverse for horizontal bar chart (top = first item)
  const chartData = [...factors].reverse();

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-card">
      <h3 className="text-base font-semibold text-foreground mb-4">Salary Factor Breakdown</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
          >
            <XAxis
              type="number"
              tickFormatter={(value) => formatAxisTick(value, currency)}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="factor"
              width={120}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number) => [`${currency}${value.toLocaleString()}`, 'Amount']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
              }}
              itemStyle={{ color: '#6366f1' }}
              cursor={false}
            />
            <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={32}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
