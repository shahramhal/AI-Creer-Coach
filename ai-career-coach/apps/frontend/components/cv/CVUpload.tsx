'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { cvService } from '../../services/cv.service';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Upload } from 'lucide-react';
import type { ParsedCVData } from '../../types/cv.types';
import { extractErrorMessage } from '../../utils/error.util';

interface CVUploadProps {
  onUploadSuccess: (cvId: string, parsedData: ParsedCVData) => void;
  onUploadError?: (error: string) => void;
}

export default function CVUpload({ onUploadSuccess, onUploadError }: CVUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Allowed file types
  const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  /**
   * Validate file type and size
   */
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please upload a PDF or DOCX file';
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 10MB';
    }

    return null;
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = (file: File) => {
    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setError(null);
    setSelectedFile(file);
  };

  /**
   * Handle file input change
   */
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  /**
   * Handle drag events
   */
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  /**
   * Upload CV to server
   */
  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await cvService.uploadCV(selectedFile);
      
      // Success - notify parent component
      onUploadSuccess(response.data.cvId, response.data.parsedData);
      
      // Reset state
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to upload CV');
      setError(errorMessage);

      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Trigger file input click
   */
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * Remove selected file
   */
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Drop zone */}
      {!selectedFile ? (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
          className={`
            relative border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer
            ${isDragging 
              ? 'border-primary bg-primary/5 scale-[1.02]' 
              : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50'
            }
            ${isUploading ? 'pointer-events-none opacity-60' : ''}
          `}
        >
          <div className="flex flex-col items-center gap-4">
            {/* Upload icon */}
            <div className={`
              w-16 h-16 rounded-full flex items-center justify-center transition-colors
              ${isDragging ? 'bg-primary/20' : 'bg-primary/10'}
            `}>
              <Upload className={`h-8 w-8 transition-colors ${isDragging ? 'text-primary' : 'text-primary/70'}`} />
            </div>
            
            {/* Text */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Upload your CV</h3>
              <p className="text-sm text-muted-foreground">
                Drag and drop a PDF or DOCX file, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, DOCX up to 10MB
              </p>
            </div>
          </div>
        </div>
      ) : (
        // Selected file display
        <Card className="border-border bg-card">
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                {/* File icon */}
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <svg className="h-6 w-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {!isUploading && (
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={handleUpload}
                        disabled={isUploading}
                      >
                        Upload & Parse
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRemoveFile}
                        disabled={isUploading}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Remove button */}
              {!isUploading && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="flex-shrink-0"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              )}
            </div>

            {/* Loading state */}
            {isUploading && (
              <div className="mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                  <p className="text-sm text-muted-foreground">Parsing your CV with AI...</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Error message */}
      {error && (
        <Card className="mt-4 border-destructive/50 bg-destructive/10">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
