'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/authContext';
import { cvService } from '../../services/cv.service';
import { AppLayout } from '../../components/layout/AppLayout';
import CVUpload from '../../components/cv/CVUpload';
import CVList from '../../components/cv/CVList';
import CVDetail from '../../components/cv/CVDetail';
import CVSummaryCard from '../../components/cv/CVSummaryCard';
import CVAnalysisTabs from '../../components/cv/CVAnalysisTabs';
import { useUserCVs, queryKeys } from '../../hooks/queries';
import type { CV, ParsedCVData } from '../../types/cv.types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Upload, FileText } from 'lucide-react';

export default function CVsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [selectedCV, setSelectedCV] = useState<CV | null>(null);
  const [detailCV, setDetailCV] = useState<CV | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const isReady = isAuthenticated && !authLoading;
  const cvsQuery = useUserCVs(isReady);
  const cvs = cvsQuery.data?.data ?? [];

  // Auto-select primary CV on load (falls back to first CV if none is primary)
  useEffect(() => {
    if (cvs.length > 0 && !selectedCV) {
      const primaryCV = cvs.find(cv => cv.isPrimary) ?? cvs[0];
      setSelectedCV(primaryCV);
    }
  }, [cvs, selectedCV]);

  const handleUploadSuccess = async (_cvId: string, _parsedData: ParsedCVData) => {
    setShowUpload(false);
    setError(null);
    await queryClient.refetchQueries({ queryKey: queryKeys.cvs });
    const freshData = queryClient.getQueryData<{ data: CV[] }>(queryKeys.cvs);
    if (freshData && freshData.data.length > 0) {
      setSelectedCV(freshData.data[0]);
    }
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleCVSelect = (cv: CV) => {
    setSelectedCV(cv);
  };

  const handleCVViewDetail = (cv: CV) => {
    setDetailCV(cv);
  };

  const handleCVDetailClose = () => {
    setDetailCV(null);
  };

  const handleCVUpdate = (updatedCV: CV) => {
    queryClient.setQueryData<{ data: CV[] }>(queryKeys.cvs, (old) => {
      if (!old) return old;
      return { ...old, data: old.data.map((cv) => (cv.id === updatedCV.id ? updatedCV : cv)) };
    });
    if (selectedCV?.id === updatedCV.id) {
      setSelectedCV(updatedCV);
    }
    if (detailCV?.id === updatedCV.id) {
      setDetailCV(updatedCV);
    }
  };

  const handleSetPrimary = async (cvId: string) => {
    try {
      await cvService.setPrimaryCV(cvId);
      queryClient.setQueryData<{ data: CV[] }>(queryKeys.cvs, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((cv) => ({ ...cv, isPrimary: cv.id === cvId })),
        };
      });
      // Switch the displayed CV to the newly primary one
      const freshData = queryClient.getQueryData<{ data: CV[] }>(queryKeys.cvs);
      const primaryCV = freshData?.data.find(cv => cv.id === cvId);
      if (primaryCV) {
        setSelectedCV(primaryCV);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set primary CV';
      setError(errorMessage);
    }
  };

  const handleCVDeleteFromList = (cvId: string) => {
    removeCVFromState(cvId);
  };

  const handleCVDeleteFromSummary = async (cvId: string, _filename: string) => {
    try {
      await cvService.deleteCV(cvId);
      removeCVFromState(cvId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete CV';
      setError(errorMessage);
    }
  };

  const removeCVFromState = (cvId: string) => {
    queryClient.setQueryData<{ data: CV[] }>(queryKeys.cvs, (old) => {
      if (!old) return old;
      return { ...old, data: old.data.filter((cv) => cv.id !== cvId) };
    });
    const updatedCache = queryClient.getQueryData<{ data: CV[] }>(queryKeys.cvs);
    const remaining = updatedCache?.data ?? [];
    if (selectedCV?.id === cvId) {
      setSelectedCV(remaining.length > 0 ? remaining[0] : null);
    }
    if (detailCV?.id === cvId) {
      setDetailCV(null);
    }
  };

  const handleDownload = async (cvId: string, filename: string) => {
    await cvService.downloadCV(cvId, filename);
  };

  const handleAnalyze = useCallback(async () => {
    if (!selectedCV) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Backend saves analysis to DB and clears Redis cache before responding
      await cvService.analyzeCV(selectedCV.id);

      // Refetch from DB to get the confirmed saved analysis data
      await queryClient.refetchQueries({ queryKey: queryKeys.cvs });

      // Find the analyzed CV in the fresh server data and display it
      const freshData = queryClient.getQueryData<{ data: CV[] }>(queryKeys.cvs);
      const freshCV = freshData?.data.find(cv => cv.id === selectedCV.id);
      if (freshCV) {
        setSelectedCV(freshCV);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze CV';
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedCV, queryClient]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">CV Analysis</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload, analyze, and optimize your CV with AI-powered insights
            </p>
          </div>
          <Button onClick={() => setShowUpload(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload New CV
          </Button>
        </div>

        {/* Error display */}
        {(error || cvsQuery.isError) && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-destructive flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm text-destructive font-medium">
                  {error || 'Failed to load CVs'}
                </p>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-destructive/60 hover:text-destructive transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Card */}
        {showUpload && (
          <Card className="border-border bg-card shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Upload New CV</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUpload(false)}
                className="h-8 w-8 p-0"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </CardHeader>
            <CardContent>
              <CVUpload
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        {cvsQuery.isLoading ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
            <p className="mt-3 text-sm text-muted-foreground">Loading your CVs...</p>
          </div>
        ) : cvs.length === 0 ? (
          /* Empty State */
          <div className="bg-card border border-border rounded-xl p-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-foreground">No CVs uploaded yet</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Upload your first CV to get started with AI-powered analysis, ATS compatibility checks, and personalized recommendations.
            </p>
            <Button
              onClick={() => setShowUpload(true)}
              className="mt-6 gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Your First CV
            </Button>
          </div>
        ) : (
          <>
            {/* Selected CV Summary */}
            {selectedCV && (
              <>
                <CVSummaryCard
                  cv={selectedCV}
                  onViewDetail={handleCVViewDetail}
                  onDownload={handleDownload}
                  onDelete={handleCVDeleteFromSummary}
                />

                {/* Analysis Tabs */}
                <CVAnalysisTabs
                  analysisData={selectedCV.analysisData}
                  overviewData={selectedCV.overviewData}
                  isAnalyzing={isAnalyzing}
                  onAnalyze={handleAnalyze}
                />
              </>
            )}

            {/* CV History */}
            {cvs.length > 1 && (
              <CVList
                cvs={cvs}
                selectedCVId={selectedCV?.id}
                onCVSelect={handleCVSelect}
                onCVDelete={handleCVDeleteFromList}
                onCVUpdate={handleCVUpdate}
                onSetPrimary={handleSetPrimary}
              />
            )}
          </>
        )}
      </div>

      {/* CV Detail Modal */}
      {detailCV && (
        <CVDetail
          cv={detailCV}
          onClose={handleCVDetailClose}
          onUpdate={handleCVUpdate}
        />
      )}
    </AppLayout>
  );
}
