// apps/frontend/app/cvs/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/authContext';
import { cvService } from '../../services/cv.service';
import { AppLayout } from '../../components/layout/AppLayout';
import CVUpload from '../../components/cv/CVUpload';
import CVList from '../../components/cv/CVList';
import CVDetail from '../../components/cv/CVDetail';
import CVSummaryCard from '../../components/cv/CVSummaryCard';
import CVAnalysisTabs from '../../components/cv/CVAnalysisTabs';
import type { CV, ParsedCVData, CVOverviewData } from '../../types/cv.types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Upload, FileText } from 'lucide-react';

export default function CVsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  const [cvs, setCvs] = useState<CV[]>([]);
  const [selectedCV, setSelectedCV] = useState<CV | null>(null);
  const [detailCV, setDetailCV] = useState<CV | null>(null);
  const [isLoadingCVs, setIsLoadingCVs] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Load user CVs on mount
  useEffect(() => {
    if (user) {
      loadCVs();
    }
  }, [user]);

  const loadCVs = async () => {
    setIsLoadingCVs(true);
    setError(null);

    try {
      const response = await cvService.getUserCVs();
      const loadedCvs = response.data;
      setCvs(loadedCvs);

      // Auto-select the latest CV (first in the list)
      if (loadedCvs.length > 0 && !selectedCV) {
        setSelectedCV(loadedCvs[0]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load CVs';
      setError(errorMessage);
    } finally {
      setIsLoadingCVs(false);
    }
  };

  const handleUploadSuccess = async (cvId: string, parsedData: ParsedCVData) => {
    setShowUpload(false);
    setIsLoadingCVs(true);
    setError(null);

    try {
      const response = await cvService.getUserCVs();
      const loadedCvs = response.data;
      setCvs(loadedCvs);
      // Auto-select the newly uploaded CV (first in list)
      if (loadedCvs.length > 0) {
        setSelectedCV(loadedCvs[0]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load CVs';
      setError(errorMessage);
    } finally {
      setIsLoadingCVs(false);
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
    const updatedCvs = cvs.map(cv => cv.id === updatedCV.id ? updatedCV : cv);
    setCvs(updatedCvs);
    if (selectedCV?.id === updatedCV.id) {
      setSelectedCV(updatedCV);
    }
    if (detailCV?.id === updatedCV.id) {
      setDetailCV(updatedCV);
    }
  };

  // Called by CVList (which already calls cvService.deleteCV internally)
  const handleCVDeleteFromList = (cvId: string) => {
    removeCVFromState(cvId);
  };

  // Called by CVSummaryCard (needs to call the API)
  const handleCVDeleteFromSummary = async (cvId: string, filename: string) => {
    try {
      await cvService.deleteCV(cvId);
      removeCVFromState(cvId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete CV';
      setError(errorMessage);
    }
  };

  const removeCVFromState = (cvId: string) => {
    const updatedCvs = cvs.filter(cv => cv.id !== cvId);
    setCvs(updatedCvs);

    if (selectedCV?.id === cvId) {
      setSelectedCV(updatedCvs.length > 0 ? updatedCvs[0] : null);
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
      const response = await cvService.analyzeCV(selectedCV.id);
      const overviewData: CVOverviewData = response.data;

      const updatedCV: CV = { ...selectedCV, analysisData: null, overviewData };
      setSelectedCV(updatedCV);
      setCvs(prev => prev.map(cv => cv.id === updatedCV.id ? updatedCV : cv));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze CV';
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedCV]);

  // Show loading spinner while checking auth
  if (isLoading || !isAuthenticated) {
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
        {error && (
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
                <p className="text-sm text-destructive font-medium">{error}</p>
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
        {isLoadingCVs ? (
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
