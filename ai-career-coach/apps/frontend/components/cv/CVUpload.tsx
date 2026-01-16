// apps/frontend/components/cv/CVUpload.tsx

'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { cvService } from '../../services/cv.service';
import type { ParsedCVData } from '../../types/cv.types';

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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload CV';
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
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 bg-white'}
          ${isUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer hover:border-indigo-400'}
        `}
        onClick={!selectedFile ? handleBrowseClick : undefined}
      >
        {!selectedFile ? (
          // Upload prompt
          <div className="space-y-4">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            
            <div className="text-sm text-gray-600">
              <p className="font-medium">Drag and drop your CV here</p>
              <p className="mt-1">or</p>
              <button
                type="button"
                className="mt-2 text-indigo-600 hover:text-indigo-700 font-medium"
                onClick={handleBrowseClick}
              >
                Browse files
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Supported formats: PDF, DOCX (Max 10MB)
            </p>
          </div>
        ) : (
          // Selected file display
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <svg
                className="h-10 w-10 text-indigo-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>

            <div className="flex justify-center space-x-3">
              <button
                type="button"
                onClick={handleRemoveFile}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isUploading}
              >
                Remove
              </button>
              <button
                type="button"
                onClick={handleUpload}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload & Parse'}
              </button>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-lg">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
              <p className="mt-3 text-sm text-gray-600">Parsing your CV...</p>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}