'use client';

import type { CV } from '../../types/cv.types';
import { FileText } from 'lucide-react';

interface CVSummaryCardProps {
  cv: CV;
  onViewDetail?: (cv: CV) => void;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-metric-excellent';
  if (score >= 60) return 'text-metric-good';
  if (score >= 40) return 'text-metric-average';
  return 'text-metric-poor';
}

export default function CVSummaryCard({ cv, onViewDetail }: CVSummaryCardProps) {
  const score = cv.analysisData?.overallScore;
  const hasAnalysis = score !== undefined && score !== null;

  const uploadDate = new Date(cv.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-card">
      <div className="flex items-center justify-between">
        {/* Left: File info */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-foreground">{cv.filename}</h3>
              {cv.isPrimary && (
                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  Latest Version
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Uploaded {uploadDate}
              {onViewDetail && (
                <>
                  <span className="mx-2 text-border">|</span>
                  <button
                    onClick={() => onViewDetail(cv)}
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    View Parsed Data
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right: Score */}
        {hasAnalysis && (
          <div className="text-right">
            <div className="flex items-baseline gap-1">
              <span className={`font-mono text-4xl font-bold ${getScoreColor(score)}`}>
                {score}
              </span>
              <span className="text-lg text-muted-foreground">/100</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
