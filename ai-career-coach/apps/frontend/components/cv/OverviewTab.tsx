'use client';

import type { AnalysisData, CVOverviewData } from '../../types/cv.types';
import { Progress } from '../ui/progress';

interface OverviewTabProps {
  data: AnalysisData | CVOverviewData;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-metric-excellent';
  if (score >= 60) return 'text-metric-good';
  if (score >= 40) return 'text-metric-average';
  return 'text-metric-poor';
}

function getProgressColor(score: number): string {
  if (score >= 80) return '[&>div]:bg-[hsl(var(--metric-excellent))]';
  if (score >= 60) return '[&>div]:bg-[hsl(var(--metric-good))]';
  if (score >= 40) return '[&>div]:bg-[hsl(var(--metric-average))]';
  return '[&>div]:bg-[hsl(var(--metric-poor))]';
}

const SCORE_LABELS: Record<string, string> = {
  contentQuality: 'Content Quality',
  formatStructure: 'Format & Structure',
  experienceClarity: 'Experience Clarity',
  atsReadability: 'ATS Readability',
  // Legacy labels (backward compat with old analysisData)
  atsCompatibility: 'ATS Compatibility',
  keywordsMatch: 'Keywords Match',
};

export default function OverviewTab({ data }: OverviewTabProps) {
  const breakdown = data.scoreBreakdown;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Score Breakdown */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-base font-semibold text-muted-foreground mb-5">Score Breakdown</h3>
        <div className="space-y-5">
          {Object.entries(breakdown).map(([key, value]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  {SCORE_LABELS[key] || key}
                </span>
                <span className={`text-sm font-bold ${getScoreColor(value)}`}>
                  {value}/100
                </span>
              </div>
              <Progress
                value={value}
                className={`h-2 bg-secondary ${getProgressColor(value)}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Priority Issues */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-base font-semibold text-muted-foreground mb-5">Priority Issues</h3>
        <div className="space-y-4">
          {data.priorityIssues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No critical issues found. Great job!</p>
          ) : (
            data.priorityIssues.map((issue, index) => (
              <div key={index} className="flex items-start gap-3 bg-muted/30 rounded-lg p-4">
                {/* Severity icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {issue.severity === 'critical' ? (
                    <svg className="h-5 w-5 text-destructive" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : issue.severity === 'warning' ? (
                    <svg className="h-5 w-5 text-warning" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-foreground">{issue.title}</h4>
                    <span className="inline-flex items-center rounded-full border border-metric-excellent/30 bg-metric-excellent/10 px-2 py-0.5 text-xs font-medium text-metric-excellent">
                      {issue.impact}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{issue.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
