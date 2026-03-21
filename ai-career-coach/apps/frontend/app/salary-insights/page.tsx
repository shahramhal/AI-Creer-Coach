'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/authContext';
import { salaryService } from '../../services/salary.service';
import dynamic from 'next/dynamic';
import { AppLayout } from '../../components/layout/AppLayout';
import SalaryRangeHero from '../../components/salary/SalaryRangeHero';

// Lazy-load chart-heavy salary components
const MarketSalaryTrend = dynamic(() => import('../../components/salary/MarketSalaryTrend'), { ssr: false });
const TopPayingRoles = dynamic(() => import('../../components/salary/TopPayingRoles'), { ssr: false });
const MissingSkillsTable = dynamic(() => import('../../components/salary/MissingSkillsTable'), { ssr: false });
const SalaryByLocation = dynamic(() => import('../../components/salary/SalaryByLocation'), { ssr: false });
import type { SalaryInsightsData } from '../../types/salary.types';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';
import { DollarSign, RefreshCw, Search } from 'lucide-react';
import api from '../../library/api';

// Adzuna-compatible location options per country (location1 values)
const LOCATION_OPTIONS: Record<string, Array<{ label: string; value: string }>> = {
  gb: [
    { label: 'London', value: 'London' },
    { label: 'South East England', value: 'South East England' },
    { label: 'North West England', value: 'North West England' },
    { label: 'West Midlands', value: 'West Midlands' },
    { label: 'Scotland', value: 'Scotland' },
    { label: 'East of England', value: 'East of England' },
    { label: 'South West England', value: 'South West England' },
    { label: 'East Midlands', value: 'East Midlands' },
    { label: 'North East England', value: 'North East England' },
    { label: 'Yorkshire', value: 'Yorkshire and The Humber' },
    { label: 'Wales', value: 'Wales' },
    { label: 'Northern Ireland', value: 'Northern Ireland' },
  ],
  us: [
    { label: 'New York', value: 'New York' },
    { label: 'California', value: 'California' },
    { label: 'Texas', value: 'Texas' },
    { label: 'Washington', value: 'Washington State' },
    { label: 'Massachusetts', value: 'Massachusetts' },
    { label: 'Illinois', value: 'Illinois' },
    { label: 'Pennsylvania', value: 'Pennsylvania' },
    { label: 'Colorado', value: 'Colorado' },
    { label: 'Georgia', value: 'Georgia' },
    { label: 'Florida', value: 'Florida' },
  ],
  de: [
    { label: 'Berlin', value: 'Berlin' },
    { label: 'Bayern', value: 'Bayern' },
    { label: 'Hamburg', value: 'Hamburg' },
    { label: 'Hessen', value: 'Hessen' },
    { label: 'NRW', value: 'Nordrhein-Westfalen' },
    { label: 'Baden-Württemberg', value: 'Baden-Württemberg' },
    { label: 'Sachsen', value: 'Sachsen' },
  ],
  fr: [
    { label: 'Île-de-France', value: 'Île-de-France' },
    { label: 'Auvergne-Rhône-Alpes', value: 'Auvergne-Rhône-Alpes' },
    { label: 'Provence-Alpes-Côte d\'Azur', value: 'Provence-Alpes-Côte d\'Azur' },
  ],
  nl: [
    { label: 'Noord-Holland', value: 'Noord-Holland' },
    { label: 'Zuid-Holland', value: 'Zuid-Holland' },
    { label: 'Noord-Brabant', value: 'Noord-Brabant' },
  ],
  au: [
    { label: 'New South Wales', value: 'New South Wales' },
    { label: 'Victoria', value: 'Victoria' },
    { label: 'Queensland', value: 'Queensland' },
    { label: 'Western Australia', value: 'Western Australia' },
  ],
  ca: [
    { label: 'Ontario', value: 'Ontario' },
    { label: 'British Columbia', value: 'British Columbia' },
    { label: 'Alberta', value: 'Alberta' },
    { label: 'Quebec', value: 'Québec' },
  ],
};

// Common job titles for suggestions
const JOB_TITLE_OPTIONS = [
  'Software Engineer',
  'Senior Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Data Scientist',
  'Data Engineer',
  'Data Analyst',
  'Machine Learning Engineer',
  'Cloud Engineer',
  'Mobile Developer',
  'iOS Developer',
  'Android Developer',
  'QA Engineer',
  'Security Engineer',
  'Solutions Architect',
  'Technical Lead',
  'Engineering Manager',
  'Product Manager',
  'Project Manager',
  'UX Designer',
  'UI Developer',
  'Business Analyst',
  'Database Administrator',
  'System Administrator',
  'Network Engineer',
  'Cyber Security Analyst',
  'Scrum Master',
  'IT Consultant',
];

export default function SalaryInsightsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();

  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('__all__');
  const [country, setCountry] = useState('gb');
  const [salaryData, setSalaryData] = useState<SalaryInsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthLoading, isAuthenticated, router]);

  // Reset location when country changes
  useEffect(() => {
    setLocation('__all__');
  }, [country]);

  // Load user profile and CV to auto-populate fields
  useEffect(() => {
    if (!user || isInitialized) return;

    const initializeFields = async () => {
      try {
        const profileResponse = await api.get(`/api/profile/${user.id}`);
        const profile = profileResponse.data?.data;

        let detectedJobTitle = profile?.jobTitle || '';
        let detectedLocation = profile?.location || '';

        // If no job title in profile, try to detect from CV
        if (!detectedJobTitle) {
          try {
            const cvsResponse = await api.get('/api/ml/cvs');
            const cvs = cvsResponse.data?.data;
            if (cvs && cvs.length > 0) {
              const latestCV = cvs[0];
              const experience = latestCV.parsedData?.experience;
              if (experience && experience.length > 0) {
                detectedJobTitle = experience[0].title || '';
              }
            }
          } catch {
            // CV fetch is optional
          }
        }

        // Match detected job title to closest option
        if (detectedJobTitle) {
          const normalizedDetected = detectedJobTitle.toLowerCase();
          const matchedTitle = JOB_TITLE_OPTIONS.find(t =>
            t.toLowerCase() === normalizedDetected ||
            normalizedDetected.includes(t.toLowerCase()) ||
            t.toLowerCase().includes(normalizedDetected)
          );
          setJobTitle(matchedTitle || detectedJobTitle);
        }

        // Match detected location to a valid option
        if (detectedLocation) {
          const normalizedLoc = detectedLocation.toLowerCase();
          const locationOptions = LOCATION_OPTIONS[country] || [];
          const matchedLoc = locationOptions.find(l =>
            l.value.toLowerCase() === normalizedLoc ||
            normalizedLoc.includes(l.label.toLowerCase()) ||
            l.label.toLowerCase().includes(normalizedLoc)
          );
          if (matchedLoc) {
            setLocation(matchedLoc.value);
          }
        }

        setIsInitialized(true);

        // Auto-fetch if we have a job title
        const finalJobTitle = detectedJobTitle || '';
        if (finalJobTitle) {
          fetchInsights(finalJobTitle, location, country);
        }
      } catch {
        setIsInitialized(true);
      }
    };

    initializeFields();
  }, [user]);

  // Convert internal "__all__" sentinel to empty string for API calls
  const resolveLocation = (loc: string) => loc === '__all__' ? '' : loc;

  const fetchInsights = useCallback(async (title: string, loc: string, ctry: string) => {
    if (!title.trim()) {
      setError('Please select a job title to get salary insights.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiLocation = resolveLocation(loc).trim();
      const response = await salaryService.getInsights(title.trim(), apiLocation, ctry);
      setSalaryData(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load salary insights';
      setError(errorMessage);
      setSalaryData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubmit = async () => {
    const apiLocation = resolveLocation(location);
    // Save preferences
    try {
      await salaryService.savePreferences(jobTitle, apiLocation);
    } catch {
      // Non-critical, continue with fetch
    }
    fetchInsights(jobTitle, location, country);
  };

  // Show loading spinner while checking auth
  if (isAuthLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Get the display label for the selected location
  const selectedLocationLabel = location
    ? (LOCATION_OPTIONS[country] || []).find(l => l.value === location)?.label || location
    : '';

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Salary Insights</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Understand your market value and optimize your earning potential
          </p>
        </div>

        {/* Filters Bar */}
        <Card className="border-border bg-card shadow-card">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Job Title</label>
                <Select value={jobTitle} onValueChange={setJobTitle}>
                  <SelectTrigger className="w-full rounded-lg border-border bg-background text-foreground">
                    <SelectValue placeholder="Select a job title" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TITLE_OPTIONS.map(title => (
                      <SelectItem key={title} value={title}>{title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Location</label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="w-full rounded-lg border-border bg-background text-foreground">
                    <SelectValue placeholder="All regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All regions</SelectItem>
                    {(LOCATION_OPTIONS[country] || []).map(loc => (
                      <SelectItem key={loc.value} value={loc.value}>{loc.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Country</label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="w-full rounded-lg border-border bg-background text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gb">UK</SelectItem>
                    <SelectItem value="us">US</SelectItem>
                    <SelectItem value="de">Germany</SelectItem>
                    <SelectItem value="fr">France</SelectItem>
                    <SelectItem value="nl">Netherlands</SelectItem>
                    <SelectItem value="au">Australia</SelectItem>
                    <SelectItem value="ca">Canada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading || !jobTitle}
                  className="gap-2"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  {isLoading ? 'Loading...' : 'Get Insights'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="p-4">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
            <p className="mt-3 text-sm text-muted-foreground">Analyzing salary data...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !salaryData && !error && isInitialized && (
          <div className="bg-card border border-border rounded-xl p-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-foreground">Get Your Salary Insights</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Select your job title and location above to see predicted salary, market trends, and skill-based salary analysis.
            </p>
          </div>
        )}

        {/* Salary Data */}
        {!isLoading && salaryData && (
          <>
            {/* 1. Salary Range Hero (full width) */}
            <SalaryRangeHero
              prediction={salaryData.prediction}
              location={selectedLocationLabel}
            />

            {/* 2. Two-column: Top-Paying Roles + Market Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopPayingRoles
                roles={salaryData.topPayingRoles || []}
                currency={salaryData.prediction.currency}
              />
              <MarketSalaryTrend
                trend={salaryData.marketTrend}
                currency={salaryData.prediction.currency}
              />
            </div>

            {/* 3. Missing Skills Table (full width) */}
            <MissingSkillsTable
              skills={salaryData.missingSkills || []}
            />

            {/* 4. Salary by Cities (full width) */}
            <SalaryByLocation
              regions={salaryData.regionalComparison}
              currency={salaryData.prediction.currency}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}
