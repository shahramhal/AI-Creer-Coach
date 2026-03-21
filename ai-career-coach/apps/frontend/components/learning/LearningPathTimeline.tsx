'use client';

import { Badge } from '../ui/badge';
import type { LearningPhase } from '../../types/skillGap.types';
import { BookOpen, Clock } from 'lucide-react';

interface LearningPathTimelineProps {
  phases: LearningPhase[];
}

const phaseColors: Record<string, string> = {
  Foundation: 'border-red-500 bg-red-500/10',
  Intermediate: 'border-yellow-500 bg-yellow-500/10',
  Advanced: 'border-green-500 bg-green-500/10',
};

const phaseBadgeStyles: Record<string, string> = {
  Foundation: 'bg-red-500/20 text-red-400 border-red-500/30',
  Intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Advanced: 'bg-green-500/20 text-green-400 border-green-500/30',
};

export default function LearningPathTimeline({ phases }: LearningPathTimelineProps) {
  if (phases.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p>No learning path generated yet. Run a skill analysis first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {phases.map((phase, phaseIndex) => (
        <div key={phase.phase} className="relative">
          {/* Timeline connector */}
          {phaseIndex < phases.length - 1 && (
            <div className="absolute left-4 top-14 bottom-0 w-0.5 bg-border" />
          )}

          <div className={`rounded-xl border-l-4 p-5 ${phaseColors[phase.phase] || 'border-gray-500 bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background border border-border text-sm font-bold">
                  {phaseIndex + 1}
                </div>
                <h3 className="text-lg font-semibold text-foreground">{phase.phase}</h3>
                <Badge className={phaseBadgeStyles[phase.phase] || ''}>
                  {phase.skills.length} skills
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{phase.total_hours}h</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-3">{phase.description}</p>

            <div className="flex flex-wrap gap-2">
              {phase.skills.map((skill) => (
                <div
                  key={skill.name}
                  className="flex items-center gap-1.5 rounded-lg bg-background/80 border border-border px-3 py-1.5 text-sm"
                >
                  <span className="font-medium capitalize">{skill.name}</span>
                  <span className="text-xs text-muted-foreground">({skill.estimated_hours}h)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
