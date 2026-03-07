'use client';

import { useState } from 'react';
import type { CV } from '../../types/cv.types';
import { FileText, Download, Trash2 } from 'lucide-react';

interface CVSummaryCardProps {
  cv: CV;
  onViewDetail?: (cv: CV) => void;
  onDownload?: (cvId: string, filename: string) => Promise<void>;
  onDelete?: (cvId: string, filename: string) => Promise<void>;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-metric-excellent';
  if (score >= 60) return 'text-metric-good';
  if (score >= 40) return 'text-metric-average';
  return 'text-metric-poor';
}

export default function CVSummaryCard({ cv, onViewDetail, onDownload, onDelete }: CVSummaryCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const score = cv.analysisData?.overallScore;
  const hasAnalysis = score !== undefined && score !== null;

  const uploadDate = new Date(cv.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const handleDownload = async () => {
    if (!onDownload) return;
    setIsDownloading(true);
    try {
      await onDownload(cv.id, cv.filename);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${cv.filename}"?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      await onDelete(cv.id, cv.filename);
    } finally {
      setIsDeleting(false);
    }
  };

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
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-muted-foreground">
                Uploaded {uploadDate}
              </span>

              {onViewDetail && (
                <>
                  <span className="text-border">|</span>
                  <button
                    onClick={() => onViewDetail(cv)}
                    className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    View Parsed Data
                  </button>
                </>
              )}

              {/* Action icons */}
              {(onDownload || onDelete) && (
                <>
                  <span className="text-border">|</span>
                  <div className="flex items-center gap-1">
                    {onDownload && (
                      <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        title="Download CV"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        title="Delete CV"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
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
