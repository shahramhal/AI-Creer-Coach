'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/authContext';
import { salaryService } from '../../services/salary.service';
import { settingsService } from '../../services/settings.service';
import dynamic from 'next/dynamic';
import { AppLayout } from '../../components/layout/AppLayout';
import SalaryRangeHero from '../../components/salary/SalaryRangeHero';

const MarketSalaryTrend = dynamic(() => import('../../components/salary/MarketSalaryTrend'), { ssr: false });
const TopPayingRoles = dynamic(() => import('../../components/salary/TopPayingRoles'), { ssr: false });
const MissingSkillsTable = dynamic(() => import('../../components/salary/MissingSkillsTable'), { ssr: false });
const SalaryByLocation = dynamic(() => import('../../components/salary/SalaryByLocation'), { ssr: false });
import type { SalaryInsightsData } from '../../types/salary.types';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';
import { DollarSign, RefreshCw, Search } from 'lucide-react';
import { COUNTRY_OPTIONS, LOCATION_OPTIONS, JOB_TITLE_OPTIONS } from '../../utils/locationData';

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

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthLoading, isAuthenticated, router]);

  // Reset location when country changes
  useEffect(() => {
    setLocation('__all__');
  }, [country]);

  // Load career preferences from settings
  useEffect(() => {
    if (!user || isInitialized) return;

    const initializeFields = async () => {
      let resolvedJobTitle = '';
      let resolvedCountry = country;
      let resolvedLocation = location;

      try {
        const preferences = await settingsService.getCareerPreferences();
        if (preferences.country) {
          resolvedCountry = preferences.country;
          setCountry(resolvedCountry);
        }
        if (preferences.region) {
          resolvedLocation = preferences.region;
          setLocation(resolvedLocation);
        }
        if (preferences.jobTitle) {
          resolvedJobTitle = preferences.jobTitle;
          setJobTitle(resolvedJobTitle);
        } else if (preferences.targetRole) {
          const matchedTitle = JOB_TITLE_OPTIONS.find(
            (title) => title.toLowerCase() === preferences.targetRole!.toLowerCase()
          );
          if (matchedTitle) {
            resolvedJobTitle = matchedTitle;
            setJobTitle(resolvedJobTitle);
          }
        }
      } catch {
        // No preferences saved - use default unfiltered mode
      }

      setIsInitialized(true);

      // Auto-fetch if we have a job title
      if (resolvedJobTitle) {
        fetchInsights(resolvedJobTitle, resolvedLocation, resolvedCountry);
      }
    };

    initializeFields();
  }, [user]);

  const resolveLocation = (loc: string) => (loc === '__all__' ? '' : loc);

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
    try {
      await salaryService.savePreferences(jobTitle, apiLocation);
    } catch {
      // Non-critical
    }
    fetchInsights(jobTitle, location, country);
  };

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

  const selectedLocationLabel = location
    ? (LOCATION_OPTIONS[country] || []).find((locationOption) => locationOption.value === location)?.label || location
    : '';

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Salary Insights</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Understand your market value and optimize your earning potential
          </p>
        </div>

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
                    {JOB_TITLE_OPTIONS.map((title) => (
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
                    {(LOCATION_OPTIONS[country] || []).map((loc) => (
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
                    {COUNTRY_OPTIONS.map((countryOption) => (
                      <SelectItem key={countryOption.value} value={countryOption.value}>
                        {countryOption.label}
                      </SelectItem>
                    ))}
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

        {error && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="p-4">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
            <p className="mt-3 text-sm text-muted-foreground">Analyzing salary data...</p>
          </div>
        )}

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

        {!isLoading && salaryData && (
          <>
            <SalaryRangeHero
              prediction={salaryData.prediction}
              location={selectedLocationLabel}
            />

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

            <MissingSkillsTable
              skills={salaryData.missingSkills || []}
            />

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
