'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/authContext';
import { cvService } from '../../services/cv.service';
import { AppLayout } from '../../components/layout/AppLayout';
import type { CV, ATSScoreData } from '../../types/cv.types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { ScanSearch, FileText, ChevronDown } from 'lucide-react';

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-metric-excellent';
  if (score >= 60) return 'text-metric-good';
  if (score >= 40) return 'text-metric-average';
  return 'text-metric-poor';
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-metric-excellent/10 border-metric-excellent/30';
  if (score >= 60) return 'bg-metric-good/10 border-metric-good/30';
  if (score >= 40) return 'bg-metric-average/10 border-metric-average/30';
  return 'bg-metric-poor/10 border-metric-poor/30';
}

function getProgressColor(score: number): string {
  if (score >= 80) return '[&>div]:bg-[hsl(var(--metric-excellent))]';
  if (score >= 60) return '[&>div]:bg-[hsl(var(--metric-good))]';
  if (score >= 40) return '[&>div]:bg-[hsl(var(--metric-average))]';
  return '[&>div]:bg-[hsl(var(--metric-poor))]';
}

const BREAKDOWN_LABELS: Record<string, string> = {
  keywordMatch: 'Keyword Match',
  semanticSimilarity: 'Semantic Similarity',
  skillsCoverage: 'Skills Coverage',
};

export default function ATSScorePage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  const [cvs, setCvs] = useState<CV[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<string>('');
  const [jobDescription, setJobDescription] = useState('');
  const [isLoadingCvs, setIsLoadingCvs] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [atsResult, setAtsResult] = useState<ATSScoreData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCvDropdown, setShowCvDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const loadCVs = useCallback(async () => {
    setIsLoadingCvs(true);
    try {
      const response = await cvService.getUserCVs();
      const loadedCvs = response.data;
      setCvs(loadedCvs);
      // Auto-select primary CV or first CV
      const primaryCv = loadedCvs.find(cv => cv.isPrimary);
      if (primaryCv) {
        setSelectedCvId(primaryCv.id);
      } else if (loadedCvs.length > 0) {
        setSelectedCvId(loadedCvs[0].id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load CVs';
      setError(errorMessage);
    } finally {
      setIsLoadingCvs(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadCVs();
    }
  }, [user, loadCVs]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCvDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleCalculate = async () => {
    if (!jobDescription.trim() || !selectedCvId) return;

    setIsCalculating(true);
    setError(null);
    setAtsResult(null);

    try {
      const response = await cvService.checkATSScore(jobDescription.trim(), selectedCvId);
      setAtsResult(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate ATS score';
      setError(errorMessage);
    } finally {
      setIsCalculating(false);
    }
  };

  const selectedCv = cvs.find(cv => cv.id === selectedCvId);
  const canCalculate = jobDescription.trim().length >= 20 && selectedCvId && !isCalculating;

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
        <div>
          <h1 className="text-2xl font-bold text-foreground">ATS Score Checker</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste a job description to see how well your CV matches the role
          </p>
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

        {/* No CVs state */}
        {!isLoadingCvs && cvs.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-foreground">No CVs uploaded yet</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                Upload a CV first on the CV Analysis page, then come back here to check your ATS score against job descriptions.
              </p>
              <Button
                onClick={() => router.push('/cvs')}
                className="mt-6 gap-2"
              >
                <FileText className="h-4 w-4" />
                Go to CV Analysis
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column: Input form */}
            <div className="space-y-4">
              {/* CV Selector */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Select CV</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingCvs ? (
                    <div className="h-10 bg-muted animate-pulse rounded-md" />
                  ) : (
                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={() => setShowCvDropdown(!showCvDropdown)}
                        aria-haspopup="listbox"
                        aria-expanded={showCvDropdown}
                        aria-label="Select a CV"
                        className="w-full flex items-center justify-between rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">
                            {selectedCv ? selectedCv.filename : 'Select a CV...'}
                          </span>
                          {selectedCv?.isPrimary && (
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded flex-shrink-0">
                              Primary
                            </span>
                          )}
                        </div>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showCvDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showCvDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-10 max-h-48 overflow-auto">
                          {cvs.map(cv => (
                            <button
                              key={cv.id}
                              onClick={() => {
                                setSelectedCvId(cv.id);
                                setShowCvDropdown(false);
                              }}
                              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors ${
                                cv.id === selectedCvId ? 'bg-primary/5 text-primary' : 'text-foreground'
                              }`}
                            >
                              <FileText className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{cv.filename}</span>
                              {cv.isPrimary && (
                                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded flex-shrink-0">
                                  Primary
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Job Description Input */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Job Description</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the full job description here..."
                    rows={12}
                    className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-y min-h-[200px]"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {jobDescription.length > 0 ? `${jobDescription.length} characters` : 'Minimum 20 characters'}
                    </p>
                    <Button
                      onClick={handleCalculate}
                      disabled={!canCalculate}
                      className="gap-2"
                    >
                      {isCalculating ? (
                        <>
                          <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          Calculating...
                        </>
                      ) : (
                        <>
                          <ScanSearch className="h-4 w-4" />
                          Check ATS Score
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right column: Results */}
            <div>
              {isCalculating ? (
                <Card className="border-border bg-card">
                  <CardContent className="p-16 text-center">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-sm text-muted-foreground">Analyzing your CV against the job description...</p>
                    <p className="mt-1 text-xs text-muted-foreground">This may take a few seconds</p>
                  </CardContent>
                </Card>
              ) : atsResult ? (
                <div className="space-y-4">
                  {/* Score Header */}
                  <Card className="border-border bg-card">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-6">
                        <div className={`flex items-center justify-center w-20 h-20 rounded-full border-2 ${getScoreBgColor(atsResult.atsScore)}`}>
                          <div className="text-center">
                            <span className={`text-3xl font-bold ${getScoreColor(atsResult.atsScore)}`}>
                              {atsResult.atsScore}
                            </span>
                            <span className="text-xs text-muted-foreground block -mt-1">/100</span>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">ATS Score</h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {atsResult.atsScore >= 80
                              ? 'Excellent match! Your CV aligns well with this role.'
                              : atsResult.atsScore >= 60
                                ? 'Good match. Some improvements could boost your chances.'
                                : atsResult.atsScore >= 40
                                  ? 'Moderate match. Consider updating your CV for this role.'
                                  : 'Low match. Significant updates recommended.'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Score Breakdown */}
                  <Card className="border-border bg-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Score Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {Object.entries(atsResult.breakdown).map(([key, value]) => (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm text-foreground">{BREAKDOWN_LABELS[key] || key}</span>
                            <span className={`text-sm font-semibold ${getScoreColor(value)}`}>{value}/100</span>
                          </div>
                          <Progress
                            value={value}
                            className={`h-2 bg-secondary ${getProgressColor(value)}`}
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Matched Keywords */}
                  {atsResult.keywordsMatched.length > 0 && (
                    <Card className="border-border bg-card">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Matched Keywords ({atsResult.keywordsMatched.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {atsResult.keywordsMatched.map((kw, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center rounded-full bg-metric-excellent/10 border border-metric-excellent/30 px-2.5 py-0.5 text-xs font-medium text-metric-excellent"
                            >
                              {kw.keyword}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Missing Keywords */}
                  {atsResult.keywordsMissing.length > 0 && (
                    <Card className="border-border bg-card">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Missing Keywords ({atsResult.keywordsMissing.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {atsResult.keywordsMissing.map((kw, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center rounded-full bg-metric-poor/10 border border-metric-poor/30 px-2.5 py-0.5 text-xs font-medium text-metric-poor"
                              title={kw.suggestion}
                            >
                              {kw.keyword}
                              {kw.importance === 'high' && (
                                <svg className="ml-1 h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              )}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Suggestions */}
                  {atsResult.suggestions.length > 0 && (
                    <Card className="border-border bg-card">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Suggestions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {atsResult.suggestions.map((suggestion, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                              <svg className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card className="border-border bg-card">
                  <CardContent className="p-16 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <ScanSearch className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-foreground">Check Your ATS Score</h3>
                    <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                      Select a CV and paste a job description to see how well your CV matches the role's requirements.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
