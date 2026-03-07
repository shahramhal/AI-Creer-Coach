// apps/frontend/components/cv/CVCard.tsx

'use client';

import { useState } from 'react';
import type { CV } from '../../types/cv.types';

interface CVCardProps {
  cv: CV;
  isSelected?: boolean;
  onView: (cv: CV) => void;
  onSetPrimary: (cvId: string) => Promise<void>;
  onDownload: (cvId: string, filename: string) => Promise<void>;
  onDelete: (cvId: string, filename: string) => Promise<void>;
}

export default function CVCard({
  cv,
  isSelected,
  onView,
  onSetPrimary,
  onDownload,
  onDelete
}: CVCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  /**
   * Format date to readable string
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  /**
   * Handle set primary action
   */
  const handleSetPrimary = async () => {
    setIsLoading(true);
    try {
      await onSetPrimary(cv.id);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle download action
   */
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await onDownload(cv.id, cv.filename);
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * Handle delete action
   */
  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await onDelete(cv.id, cv.filename);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-card border rounded-lg p-6 transition-all ${
      isSelected
        ? 'border-primary/50 shadow-card ring-1 ring-primary/20'
        : 'border-border hover:border-primary/30 hover:shadow-card'
    }`}>
      <div className="flex items-start justify-between">
        {/* Left section: CV info */}
        <div className="flex-1">
          {/* Header with icon and filename */}
          <div className="flex items-center space-x-3">
            <svg
              className="h-10 w-10 text-primary flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                clipRule="evenodd"
              />
            </svg>

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-medium text-foreground flex items-center">
                <span className="truncate">{cv.filename}</span>
                {cv.isPrimary && (
                  <span className="ml-2 px-2 py-1 text-xs font-medium text-primary bg-primary/15 rounded-full flex-shrink-0 border border-primary/30">
                    Primary
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                Uploaded on {formatDate(cv.createdAt)}
              </p>
            </div>
          </div>

          {/* Parsed data summary */}
          {cv.parsedData && (
            <div className="mt-4 text-sm text-muted-foreground space-y-1">
              {cv.parsedData.personal?.name && (
                <p className="flex items-center">
                  <svg className="h-4 w-4 mr-2 text-muted-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-medium">Name:</span>
                  <span className="ml-1">{cv.parsedData.personal.name}</span>
                </p>
              )}

              {cv.parsedData.experience && cv.parsedData.experience.length > 0 && (
                <p className="flex items-center">
                  <svg className="h-4 w-4 mr-2 text-muted-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">Experience:</span>
                  <span className="ml-1">
                    {cv.parsedData.experience.length} position{cv.parsedData.experience.length !== 1 ? 's' : ''}
                  </span>
                </p>
              )}

              {cv.parsedData.skills && cv.parsedData.skills.length > 0 && (
                <p className="flex items-start">
                  <svg className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <span>
                    <span className="font-medium">Skills:</span>
                    <span className="ml-1">
                      {cv.parsedData.skills.slice(0, 5).join(', ')}
                      {cv.parsedData.skills.length > 5 && (
                        <span className="text-primary font-medium"> +{cv.parsedData.skills.length - 5} more</span>
                      )}
                    </span>
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right section: Action buttons */}
        <div className="ml-4 flex flex-col space-y-2 flex-shrink-0">
          {/* Select / Analyze button */}
          <button
            onClick={() => onView(cv)}
            disabled={isSelected}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isSelected
                ? 'text-primary bg-primary/15 border border-primary/30 cursor-default'
                : 'text-primary-foreground bg-primary hover:bg-primary/80'
            }`}
          >
            {isSelected ? 'Selected' : 'Select'}
          </button>

          {/* Set as Primary button (only show if not already primary) */}
          {!cv.isPrimary && (
            <button
              onClick={handleSetPrimary}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Setting...' : 'Set as Primary'}
            </button>
          )}

          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="px-4 py-2 text-sm font-medium text-foreground bg-secondary rounded-lg hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isDownloading ? 'Downloading...' : 'Download'}
          </button>

          {/* Delete button */}
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-destructive bg-destructive/10 rounded-lg hover:bg-destructive/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
