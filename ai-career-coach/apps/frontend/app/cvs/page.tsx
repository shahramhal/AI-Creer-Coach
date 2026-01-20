// apps/frontend/app/cvs/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/authContext';
import { cvService } from '../../services/cv.service';
import { AppLayout } from '../../components/layout/AppLayout';
import CVUpload from '../../components/cv/CVUpload';
import CVList from '../../components/cv/CVList';
import CVDetail from '../../components/cv/CVDetail';
import type { CV, ParsedCVData } from '../../types/cv.types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { FileText, Upload, TrendingUp } from 'lucide-react';

export default function CVsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  
  // State management
  const [cvs, setCvs] = useState<CV[]>([]);
  const [selectedCV, setSelectedCV] = useState<CV | null>(null);
  const [isLoadingCVs, setIsLoadingCVs] = useState(true);
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

  /**
   * Load all user CVs from backend
   */
  const loadCVs = async () => {
    setIsLoadingCVs(true);
    setError(null);

    try {
      const response = await cvService.getUserCVs();
      setCvs(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load CVs';
      setError(errorMessage);
    } finally {
      setIsLoadingCVs(false);
    }
  };

  /**
   * Handle successful CV upload
   */
  const handleUploadSuccess = (cvId: string, parsedData: ParsedCVData) => {
    // Reload CVs to get the new one
    loadCVs();
    
    // Hide upload modal
    setShowUpload(false);
  };

  /**
   * Handle CV upload error
   */
  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
  };

  /**
   * Handle CV selection for detailed view
   */
  const handleCVSelect = (cv: CV) => {
    setSelectedCV(cv);
  };

  /**
   * Handle CV detail close
   */
  const handleCVDetailClose = () => {
    setSelectedCV(null);
  };

  /**
   * Handle CV update from detail view
   */
  const handleCVUpdate = (updatedCV: CV) => {
    // Update in local state
    setCvs(cvs.map(cv => cv.id === updatedCV.id ? updatedCV : cv));
    setSelectedCV(updatedCV);
  };

  /**
   * Handle CV deletion
   */
  const handleCVDelete = (cvId: string) => {
    setCvs(cvs.filter(cv => cv.id !== cvId));
    setSelectedCV(null);
  };

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
            <h1 className="text-2xl font-bold text-foreground">My CVs</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload, manage, and optimize your CVs with AI-powered analysis
            </p>
          </div>
          <Button onClick={() => setShowUpload(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload New CV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border bg-card shadow-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total CVs</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-foreground">
                    {cvs.length}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cvs.filter(cv => cv.isPrimary).length} primary
                  </p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Average Score</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-metric-good">
                    {cvs.length > 0 ? '78' : '0'}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-metric-excellent">
                    <TrendingUp className="h-3 w-3" />
                    +6% this week
                  </p>
                </div>
                <div className="rounded-lg bg-metric-good/10 p-2">
                  <TrendingUp className="h-5 w-5 text-metric-good" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Last Updated</p>
                  <p className="mt-1 text-base font-medium text-foreground">
                    {cvs.length > 0 
                      ? new Date(cvs[0].updatedAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                        })
                      : 'Never'
                    }
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cvs.length > 0 ? 'Latest upload' : 'No uploads yet'}
                  </p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-2">
                  <FileText className="h-5 w-5 text-secondary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error display */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-destructive" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Modal/Card */}
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

        {/* CVs List */}
        <Card className="border-border bg-card shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Your CVs</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCVs ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
                <p className="mt-3 text-sm text-muted-foreground">Loading your CVs...</p>
              </div>
            ) : cvs.length === 0 ? (
              <div className="text-center py-16">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-foreground">No CVs uploaded yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Upload your first CV to get started with AI-powered analysis
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
              <CVList
                cvs={cvs}
                onCVSelect={handleCVSelect}
                onCVDelete={handleCVDelete}
                onCVUpdate={handleCVUpdate}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* CV Detail Modal */}
      {selectedCV && (
        <CVDetail
          cv={selectedCV}
          onClose={handleCVDetailClose}
          onUpdate={handleCVUpdate}
        />
      )}
    </AppLayout>
  );
}
