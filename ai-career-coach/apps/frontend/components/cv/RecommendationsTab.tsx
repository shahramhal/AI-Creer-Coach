'use client';

import type { Recommendation } from '../../types/cv.types';

interface RecommendationsTabProps {
  recommendations: Recommendation[];
}

function getImpactColor(impact: string): string {
  if (impact === 'High Impact') return 'text-destructive bg-destructive/10 border-destructive/30';
  if (impact === 'Medium Impact') return 'text-warning bg-warning/10 border-warning/30';
  return 'text-metric-good bg-metric-good/10 border-metric-good/30';
}

export default function RecommendationsTab({ recommendations }: RecommendationsTabProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-base font-semibold text-muted-foreground mb-5">
        Prioritized Recommendations
      </h3>

      {recommendations.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          No recommendations at this time. Your CV is in great shape!
        </p>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div
              key={rec.priority}
              className="flex items-start gap-4 rounded-lg border border-border bg-muted/20 p-5"
            >
              {/* Priority number */}
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                {rec.priority}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-foreground">{rec.title}</h4>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${getImpactColor(rec.impact)}`}
                  >
                    {rec.impact}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                  {rec.description}
                </p>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {rec.timeEstimate}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {rec.impactRate}
                  </span>
                </div>
              </div>

              {/* Apply button */}
              <button className="flex-shrink-0 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors">
                Apply
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
