'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { CategoryBreakdown } from '../../types/skillGap.types';

interface SkillCoverageChartProps {
  categoryBreakdown: CategoryBreakdown[];
  skillCoverage: number;
  matchedCount: number;
  totalTargetSkills: number;
}

export default function SkillCoverageChart({
  categoryBreakdown,
  skillCoverage,
  matchedCount,
  totalTargetSkills,
}: SkillCoverageChartProps) {
  const coverageColor = skillCoverage >= 70 ? 'text-green-600' : skillCoverage >= 40 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* Hero stat */}
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground mb-1">Overall Skill Coverage</p>
        <p className={`text-5xl font-bold ${coverageColor}`}>{skillCoverage}%</p>
        <p className="text-sm text-muted-foreground mt-2">
          {matchedCount} of {totalTargetSkills} target skills matched
        </p>
      </div>

      {/* Bar chart */}
      {categoryBreakdown.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-medium text-foreground mb-4">Skills by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryBreakdown} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={80} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="current" name="Your Skills" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="target" name="Target Skills" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
