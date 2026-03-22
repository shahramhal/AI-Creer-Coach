// apps/frontend/components/cv/CVList.tsx

'use client';

import { useState } from 'react';
import type { CV } from '../../types/cv.types';
import { cvService } from '../../services/cv.service';

interface CVListProps {
  cvs: CV[];
  selectedCVId?: string;
  onCVSelect: (cv: CV) => void;
  onCVDelete: (cvId: string) => void;
  onCVUpdate: (updatedCV: CV) => void;
  onSetPrimary?: (cvId: string) => Promise<void>;
}

export default function CVList({ cvs, selectedCVId, onCVSelect, onCVDelete, onCVUpdate, onSetPrimary }: CVListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);

  const handleSetPrimary = async (cvId: string) => {
    if (!onSetPrimary) return;
    setSettingPrimaryId(cvId);
    setError(null);
    try {
      await onSetPrimary(cvId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set primary CV';
      setError(errorMessage);
    } finally {
      setSettingPrimaryId(null);
    }
  };

  const handleDelete = async (cvId: string, filename: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${filename}"?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    setError(null);
    try {
      await cvService.deleteCV(cvId);
      onCVDelete(cvId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete CV';
      setError(errorMessage);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (cvs.length <= 1) return null;

  return (
    <div>
      {/* Error display */}
      {error && (
        <div className="mb-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Collapsible toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <svg
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          CV History
        </h3>
        <span className="text-xs text-muted-foreground/60 font-normal">
          ({cvs.length})
        </span>
      </button>

      {/* Expanded list */}
      {isOpen && (
        <div className="mt-3 space-y-2 animate-fade-in">
          {cvs.map((cv) => {
            const isSelected = selectedCVId === cv.id;
            return (
              <div
                key={cv.id}
                className={`flex items-center justify-between rounded-lg border p-3 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
                onClick={() => !isSelected && onCVSelect(cv)}
              >
                {/* Left: file info */}
                <div className="flex items-center gap-3 min-w-0">
                  <svg
                    className="h-8 w-8 text-primary flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{cv.filename}</p>
                      {cv.isPrimary && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium text-primary bg-primary/15 rounded-full border border-primary/30 flex-shrink-0">
                          Primary
                        </span>
                      )}
                      {isSelected && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium text-metric-excellent bg-metric-excellent/15 rounded-full border border-metric-excellent/30 flex-shrink-0">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(cv.createdAt)}
                      {(cv.overviewData || cv.analysisData) && (
                        <span className="ml-2 text-metric-good font-medium">
                          Score: {(cv.overviewData?.overallScore ?? cv.analysisData?.overallScore)}/100
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right: quick actions */}
                <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                  {!cv.isPrimary && onSetPrimary && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetPrimary(cv.id);
                      }}
                      disabled={settingPrimaryId === cv.id}
                      className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {settingPrimaryId === cv.id ? 'Setting...' : 'Set as Primary'}
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(cv.id, cv.filename);
                    }}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
