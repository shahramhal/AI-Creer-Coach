'use client';

import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import type { MissingSkill } from '../../types/skillGap.types';
import { Clock, TrendingUp, Zap, Info } from 'lucide-react';

interface SkillGapCardProps {
  skill: MissingSkill;
}

const priorityStyles: Record<string, string> = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
};

export default function SkillGapCard({ skill }: SkillGapCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-foreground capitalize">{skill.name}</h4>
          <Badge className={priorityStyles[skill.priority] || ''}>
            {skill.priority}
          </Badge>
        </div>

        <Badge variant="outline" className="text-xs mb-3">
          {skill.category.replace(/_/g, ' ')}
        </Badge>

        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{skill.estimated_hours}h</span>
          </div>
          <div className="flex items-center gap-1 text-green-400">
            <TrendingUp className="h-3 w-3" />
            <span>{skill.salary_impact}</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            <span>ROI {skill.roi_score}</span>
            <span title="Return on Investment: salary impact relative to learning time. Higher = better value.">
              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
