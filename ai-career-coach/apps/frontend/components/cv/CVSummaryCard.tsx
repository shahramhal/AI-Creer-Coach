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
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            {/* Filename + badge */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-semibold text-foreground">{cv.filename}</h3>
                {cv.isPrimary && (
                  <span className="inline-flex shrink-0 items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    Latest Version
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm text-muted-foreground">Uploaded {uploadDate}</span>
                {onViewDetail && (
                  <button
                    onClick={() => onViewDetail(cv)}
                    className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    View Parsed Data
                  </button>
                )}
                {(onDownload || onDelete) && (
                  <div className="flex items-center gap-1">
                    {onDownload && (
                      <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        title="Download CV"
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        title="Delete CV"
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Score */}
            {hasAnalysis && (
              <div className="shrink-0 text-right">
                <div className="flex items-baseline gap-0.5">
                  <span className={`font-mono text-3xl font-bold ${getScoreColor(score)}`}>
                    {score}
                  </span>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
