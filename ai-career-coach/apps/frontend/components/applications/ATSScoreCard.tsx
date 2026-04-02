'use client';

import { useState } from 'react';
import type { ATSScoreData } from '../../types/cv.types';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';

interface ATSScoreCardProps {
  applicationId: string;
  atsData: ATSScoreData | null;
  onCalculate: (applicationId: string) => Promise<void>;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-metric-excellent';
  if (score >= 60) return 'text-metric-good';
  if (score >= 40) return 'text-metric-average';
  return 'text-metric-poor';
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-metric-excellent/10 border-metric-excellent/30';
  if (score >= 60) return 'bg-metric-good/10 border-metric-good/30';
  if (score >= 40) return 'bg-metric-average/10 border-metric-average/30';
  return 'bg-metric-poor/10 border-metric-poor/30';
}

function getProgressColor(score: number): string {
  if (score >= 80) return '[&>div]:bg-[hsl(var(--metric-excellent))]';
  if (score >= 60) return '[&>div]:bg-[hsl(var(--metric-good))]';
  if (score >= 40) return '[&>div]:bg-[hsl(var(--metric-average))]';
  return '[&>div]:bg-[hsl(var(--metric-poor))]';
}

const BREAKDOWN_LABELS: Record<string, string> = {
  keywordMatch: 'Keyword Match',
  semanticSimilarity: 'Semantic Similarity',
  skillsCoverage: 'Skills Coverage',
};

export default function ATSScoreCard({
  applicationId,
  atsData,
  onCalculate,
}: ATSScoreCardProps) {
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = async () => {
    setIsCalculating(true);
    try {
      await onCalculate(applicationId);
    } finally {
      setIsCalculating(false);
    }
  };

  // No ATS data yet - show CTA
  if (!atsData) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <h3 className="text-base font-semibold text-foreground mb-2">ATS Score</h3>
        <p className="text-sm text-muted-foreground mb-4">
          See how well your CV matches this job's requirements.
        </p>
        <Button
          onClick={handleCalculate}
          disabled={isCalculating}
          variant="outline"
          className="gap-2"
        >
          {isCalculating ? (
            <>
              <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Calculating...
            </>
          ) : (
            'Calculate ATS Score'
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-6">
      {/* Header with score */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">ATS Score</h3>
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-14 h-14 rounded-full border-2 ${getScoreBgColor(atsData.atsScore)}`}>
            <span className={`text-xl font-bold ${getScoreColor(atsData.atsScore)}`}>
              {atsData.atsScore}
            </span>
          </div>
          <Button
            onClick={handleCalculate}
            disabled={isCalculating}
            variant="ghost"
            size="sm"
          >
            {isCalculating ? 'Recalculating...' : 'Recalculate'}
          </Button>
        </div>
      </div>

      {/* Breakdown bars */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">Score Breakdown</h4>
        {Object.entries(atsData.breakdown).map(([key, value]) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-foreground">{BREAKDOWN_LABELS[key] || key}</span>
              <span className={`text-sm font-semibold ${getScoreColor(value)}`}>{value}/100</span>
            </div>
            <Progress
              value={value}
              className={`h-2 bg-secondary ${getProgressColor(value)}`}
            />
          </div>
        ))}
      </div>

      {/* Matched Keywords */}
      {atsData.keywordsMatched.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Matched Keywords ({atsData.keywordsMatched.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {atsData.keywordsMatched.map((kw, index) => (
              <span
                key={index}
                className="inline-flex items-center rounded-full bg-metric-excellent/10 border border-metric-excellent/30 px-2.5 py-0.5 text-xs font-medium text-metric-excellent"
              >
                {kw.keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Missing Keywords */}
      {atsData.keywordsMissing.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Missing Keywords ({atsData.keywordsMissing.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {atsData.keywordsMissing.map((kw, index) => (
              <span
                key={index}
                className="inline-flex items-center rounded-full bg-metric-poor/10 border border-metric-poor/30 px-2.5 py-0.5 text-xs font-medium text-metric-poor"
                title={kw.suggestion}
              >
                {kw.keyword}
                {kw.importance === 'high' && (
                  <svg className="ml-1 h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {atsData.suggestions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Suggestions</h4>
          <ul className="space-y-2">
            {atsData.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                <svg className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
