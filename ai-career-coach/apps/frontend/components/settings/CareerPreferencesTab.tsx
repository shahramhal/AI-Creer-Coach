'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { settingsService } from '@/services/settings.service';
import { COUNTRY_OPTIONS, LOCATION_OPTIONS } from '@/utils/locationData';

const TARGET_ROLES = [
  'Frontend Engineer',
  'Senior Frontend Engineer',
  'Backend Engineer',
  'Senior Backend Engineer',
  'Full Stack Engineer',
  'Senior Full Stack Engineer',
  'DevOps Engineer',
  'Data Scientist',
  'Machine Learning Engineer',
  'Product Manager',
  'Engineering Manager',
  'Software Architect',
  'Mobile Developer',
  'UI/UX Designer',
];

const EXPERIENCE_LEVELS = [
  { value: 'Junior', label: 'Junior (0-3 years)' },
  { value: 'Mid-level', label: 'Mid-Level (3-5 years)' },
  { value: 'Senior', label: 'Senior (5+ years)' },
];

const WORK_ARRANGEMENTS = ['Remote', 'Hybrid', 'On-site'];

export function CareerPreferencesTab() {
  const { showSuccessToast, showErrorToast } = useToast();
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [targetRole, setTargetRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [companyInput, setCompanyInput] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [workArrangements, setWorkArrangements] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const preferences = await settingsService.getCareerPreferences();
        if (preferences.targetRole) setTargetRole(preferences.targetRole);
        if (preferences.experienceLevel) setExperienceLevel(preferences.experienceLevel);
        if (preferences.targetCompanies) setTargetCompanies(preferences.targetCompanies);
        if (preferences.country) setCountry(preferences.country);
        if (preferences.region) setRegion(preferences.region);
        if (preferences.salaryMin) setSalaryMin(String(preferences.salaryMin));
        if (preferences.salaryMax) setSalaryMax(String(preferences.salaryMax));
        if (preferences.workArrangements) setWorkArrangements(preferences.workArrangements);
      } catch {
        // Silently fail - fields stay empty
      } finally {
        setIsLoadingPreferences(false);
      }
    };

    loadPreferences();
  }, []);

  // Reset region when country changes
  useEffect(() => {
    if (country) {
      const regionOptions = LOCATION_OPTIONS[country] || [];
      const currentRegionValid = regionOptions.some((regionOption) => regionOption.value === region);
      if (!currentRegionValid) {
        setRegion('');
      }
    }
  }, [country]);

  const handleAddCompany = () => {
    const trimmedInput = companyInput.trim();
    if (trimmedInput && !targetCompanies.includes(trimmedInput)) {
      setTargetCompanies([...targetCompanies, trimmedInput]);
      setCompanyInput('');
    }
  };

  const handleRemoveCompany = (company: string) => {
    setTargetCompanies(targetCompanies.filter((companyItem) => companyItem !== company));
  };

  const handleCompanyKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddCompany();
    }
  };

  const toggleWorkArrangement = (arrangement: string) => {
    setWorkArrangements((previous) =>
      previous.includes(arrangement)
        ? previous.filter((item) => item !== arrangement)
        : [...previous, arrangement]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await settingsService.updateCareerPreferences({
        targetRole: targetRole || null,
        experienceLevel: experienceLevel || null,
        targetCompanies,
        country: country || null,
        region: region || null,
        salaryMin: salaryMin ? parseInt(salaryMin, 10) : null,
        salaryMax: salaryMax ? parseInt(salaryMax, 10) : null,
        workArrangements,
      });
      showSuccessToast('Your career preferences have been updated.');
    } catch {
      showErrorToast('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingPreferences) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Career Preferences</CardTitle>
          <CardDescription>Configure your job search preferences and target roles</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const regionOptions = LOCATION_OPTIONS[country] || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Career Preferences</CardTitle>
        <CardDescription>Configure your job search preferences and target roles</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="target-role">Target Role</Label>
            <Select value={targetRole} onValueChange={setTargetRole}>
              <SelectTrigger id="target-role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {TARGET_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience-level">Experience Level</Label>
            <Select value={experienceLevel} onValueChange={setExperienceLevel}>
              <SelectTrigger id="experience-level">
                <SelectValue placeholder="Select experience level" />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <Label>Target Companies</Label>
          <div className="flex flex-wrap gap-2">
            {targetCompanies.map((company) => (
              <Badge key={company} variant="secondary" className="gap-1 pr-1">
                {company}
                <button
                  onClick={() => handleRemoveCompany(company)}
                  className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <div className="flex items-center gap-1">
              <Input
                value={companyInput}
                onChange={(event) => setCompanyInput(event.target.value)}
                onKeyDown={handleCompanyKeyDown}
                placeholder="Add company..."
                className="h-7 w-32 text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleAddCompany}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger id="country">
                <SelectValue placeholder="Select a country" />
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

          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Select
              value={region}
              onValueChange={setRegion}
              disabled={!country || regionOptions.length === 0}
            >
              <SelectTrigger id="region">
                <SelectValue placeholder={country ? 'Select a region' : 'Select a country first'} />
              </SelectTrigger>
              <SelectContent>
                {regionOptions.map((regionOption) => (
                  <SelectItem key={regionOption.value} value={regionOption.value}>
                    {regionOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Salary Expectation</Label>
          <div className="flex items-center gap-2 max-w-md">
            <Input
              value={salaryMin}
              onChange={(event) => setSalaryMin(event.target.value)}
              placeholder="Min"
              type="number"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              value={salaryMax}
              onChange={(event) => setSalaryMax(event.target.value)}
              placeholder="Max"
              type="number"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Work Arrangement</Label>
          <div className="flex gap-4">
            {WORK_ARRANGEMENTS.map((arrangement) => (
              <label key={arrangement} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={workArrangements.includes(arrangement)}
                  onChange={() => toggleWorkArrangement(arrangement)}
                  className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">{arrangement}</span>
              </label>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}
