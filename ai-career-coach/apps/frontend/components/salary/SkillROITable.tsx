'use client';

import { Clock, TrendingUp } from 'lucide-react';
import type { SkillROIEntry } from '../../types/salary.types';

interface SkillROITableProps {
  skills: SkillROIEntry[];
  currency: string;
}

function getPriorityColor(priority: 'High' | 'Medium' | 'Low'): string {
  switch (priority) {
    case 'High': return 'text-metric-poor bg-metric-poor/15 border-metric-poor/30';
    case 'Medium': return 'text-yellow-400 bg-yellow-400/15 border-yellow-400/30';
    case 'Low': return 'text-muted-foreground bg-muted/50 border-border';
  }
}

export default function SkillROITable({ skills, currency }: SkillROITableProps) {
  if (skills.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-card">
        <h3 className="text-base font-semibold text-foreground mb-4">Skill ROI Calculator</h3>
        <p className="text-sm text-muted-foreground text-center py-8">
          Upload a CV to see skill-based salary insights
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-card">
      <h3 className="text-base font-semibold text-foreground mb-4">Skill ROI Calculator</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-sm font-medium text-muted-foreground pb-3 pr-4">Skill</th>
              <th className="text-left text-sm font-medium text-muted-foreground pb-3 pr-4">Avg. Salary Increase</th>
              <th className="text-left text-sm font-medium text-muted-foreground pb-3 pr-4">Learning Time</th>
              <th className="text-left text-sm font-medium text-muted-foreground pb-3 pr-4">Demand Trend</th>
              <th className="text-right text-sm font-medium text-muted-foreground pb-3">Priority</th>
            </tr>
          </thead>
          <tbody>
            {skills.map((skill, index) => (
              <tr key={index} className="border-b border-border/50 last:border-0">
                <td className="py-4 pr-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-medium border border-border bg-muted/30 text-foreground">
                    {skill.skill}
                  </span>
                </td>
                <td className="py-4 pr-4">
                  <span className="text-sm font-semibold text-metric-excellent">
                    +{currency}{Math.round(skill.avgSalaryIncrease / 1000)}k
                  </span>
                </td>
                <td className="py-4 pr-4">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{skill.learningTime}</span>
                  </div>
                </td>
                <td className="py-4 pr-4">
                  <div className="flex items-center gap-1.5 text-sm text-metric-excellent">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>{skill.demandTrend}%</span>
                  </div>
                </td>
                <td className="py-4 text-right">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(skill.priority)}`}>
                    {skill.priority}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
