// apps/frontend/components/cv/CVList.tsx

'use client';

import { useState } from 'react';
import type { CV } from '../../types/cv.types';
import { cvService } from '../../services/cv.service';
import CVCard from './CVCard';

interface CVListProps {
  cvs: CV[];
  onCVSelect: (cv: CV) => void;
  onCVDelete: (cvId: string) => void;
  onCVUpdate: (updatedCV: CV) => void;
}

/**
 * CVList - Display list of user's CVs
 * Split into "Latest CV" and collapsible "CV History"
 */
export default function CVList({ cvs, onCVSelect, onCVDelete, onCVUpdate }: CVListProps) {
  const [error, setError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleSetPrimary = async (cvId: string) => {
    setError(null);
    try {
      const response = await cvService.setPrimaryCV(cvId);
      onCVUpdate(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set primary CV';
      setError(errorMessage);
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

  const handleDownload = async (cvId: string, filename: string) => {
    try {
      await cvService.downloadCV(cvId, filename);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download CV';
      setError(errorMessage);
    }
  };

  if (cvs.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-16 w-16 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-foreground">No CVs uploaded yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your first CV to get started with AI-powered analysis
        </p>
      </div>
    );
  }

  const [latestCv, ...historyCvs] = cvs;

  return (
    <div className="space-y-6">
      {/* Error display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
          <div className="flex">
            <svg className="h-5 w-5 text-destructive" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="ml-3 text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Latest CV */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Latest CV
        </h3>
        <CVCard
          cv={latestCv}
          onView={onCVSelect}
          onSetPrimary={handleSetPrimary}
          onDownload={handleDownload}
          onDelete={handleDelete}
        />
      </div>

      {/* CV History (collapsible) */}
      {historyCvs.length > 0 && (
        <div>
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="flex items-center gap-2 w-full text-left group"
          >
            <svg
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                isHistoryOpen ? 'rotate-180' : ''
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
              ({historyCvs.length})
            </span>
          </button>

          {isHistoryOpen && (
            <div className="mt-3 grid grid-cols-1 gap-4 animate-fade-in">
              {historyCvs.map((cv) => (
                <CVCard
                  key={cv.id}
                  cv={cv}
                  onView={onCVSelect}
                  onSetPrimary={handleSetPrimary}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
