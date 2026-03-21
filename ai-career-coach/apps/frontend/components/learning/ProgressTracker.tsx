'use client';

import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import type { ProgressSummary } from '../../types/skillGap.types';
import { BookOpen, CheckCircle, Clock, Target } from 'lucide-react';

interface ProgressTrackerProps {
  summary: ProgressSummary;
}

export default function ProgressTracker({ summary }: ProgressTrackerProps) {
  const statCards = [
    { label: 'Total Paths', value: summary.totalPaths, icon: Target, color: 'text-blue-600' },
    { label: 'Completed', value: summary.completedPaths, icon: CheckCircle, color: 'text-green-600' },
    { label: 'In Progress', value: summary.inProgressPaths, icon: BookOpen, color: 'text-yellow-600' },
    { label: 'Hours Done', value: summary.completedHours, icon: Clock, color: 'text-purple-600' },
  ];

  const statusStyles: Record<string, string> = {
    completed: 'bg-green-100 text-green-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    not_started: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <stat.icon className={`h-6 w-6 mx-auto mb-2 ${stat.color}`} />
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overall progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-foreground">Overall Progress</h3>
            <span className="text-sm font-bold text-foreground">{summary.overallProgress}%</span>
          </div>
          <Progress value={summary.overallProgress} className="h-3 mb-2" />
          <p className="text-xs text-muted-foreground">
            {summary.completedHours} of {summary.totalEstimatedHours} estimated hours completed
          </p>
        </CardContent>
      </Card>

      {/* Learning paths list */}
      {summary.paths.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Learning Paths</h3>
          {summary.paths.map((path) => (
            <Card key={path.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground capitalize">{path.skillName}</span>
                    <Badge variant="outline" className="text-xs">
                      {path.skillCategory.replace(/_/g, ' ')}
                    </Badge>
                    <Badge className={`text-xs ${statusStyles[path.status] || ''}`}>
                      {path.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <span className="text-sm font-bold text-foreground">{path.progressPercentage}%</span>
                </div>
                <Progress value={path.progressPercentage} className="h-2" />
                {path.estimatedHours && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Est. {path.estimatedHours} hours
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
