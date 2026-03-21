'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { ToastContainer } from '@/components/ui/toast';
import { settingsService } from '@/services/settings.service';
import { COUNTRY_OPTIONS, LOCATION_OPTIONS, JOB_TITLE_OPTIONS } from '@/utils/locationData';
import {
  EXPERIENCE_LEVEL_OPTIONS,
  WORK_ARRANGEMENT_OPTIONS,
  JOB_TYPE_OPTIONS,
} from '@/constants/options';

const careerPreferencesSchema = z.object({
  targetRole: z.string(),
  experienceLevel: z.string(),
  targetCompanies: z.array(z.string()),
  country: z.string(),
  region: z.string(),
  salaryMin: z.string(),
  salaryMax: z.string(),
  workArrangements: z.array(z.string()),
  preferredJobTypes: z.array(z.string()),
}).refine(
  (data) => {
    if (data.salaryMin && data.salaryMax) {
      return parseInt(data.salaryMin, 10) <= parseInt(data.salaryMax, 10);
    }
    return true;
  },
  { message: 'Minimum salary cannot exceed maximum salary', path: ['salaryMin'] }
);

type CareerPreferencesFormData = z.infer<typeof careerPreferencesSchema>;

export function CareerPreferencesTab() {
  const { toasts, dismissToast, showSuccessToast, showErrorToast } = useToast();
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [companyInput, setCompanyInput] = useState('');

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CareerPreferencesFormData>({
    resolver: zodResolver(careerPreferencesSchema),
    defaultValues: {
      targetRole: '',
      experienceLevel: '',
      targetCompanies: [],
      country: '',
      region: '',
      salaryMin: '',
      salaryMax: '',
      workArrangements: [],
      preferredJobTypes: [],
    },
  });

  const watchedCountry = watch('country');
  const watchedCompanies = watch('targetCompanies');
  const watchedWorkArrangements = watch('workArrangements');
  const watchedJobTypes = watch('preferredJobTypes');

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const preferences = await settingsService.getCareerPreferences();
        if (preferences.targetRole) setValue('targetRole', preferences.targetRole);
        if (preferences.experienceLevel) setValue('experienceLevel', preferences.experienceLevel);
        if (preferences.targetCompanies) setValue('targetCompanies', preferences.targetCompanies);
        if (preferences.country) setValue('country', preferences.country);
        if (preferences.region) setValue('region', preferences.region);
        if (preferences.salaryMin) setValue('salaryMin', String(preferences.salaryMin));
        if (preferences.salaryMax) setValue('salaryMax', String(preferences.salaryMax));
        if (preferences.workArrangements) setValue('workArrangements', preferences.workArrangements);
        if (preferences.preferredJobTypes) setValue('preferredJobTypes', preferences.preferredJobTypes);
      } catch {
      } finally {
        setIsLoadingPreferences(false);
      }
    };

    loadPreferences();
  }, [setValue]);

  useEffect(() => {
    if (watchedCountry) {
      const regionOptions = LOCATION_OPTIONS[watchedCountry] || [];
      const currentRegion = getValues('region');
      const currentRegionValid = regionOptions.some((regionOption) => regionOption.value === currentRegion);
      if (!currentRegionValid) {
        setValue('region', '');
      }
    }
  }, [watchedCountry, setValue, getValues]);

  const handleAddCompany = () => {
    const trimmedInput = companyInput.trim();
    if (trimmedInput && !watchedCompanies.includes(trimmedInput)) {
      setValue('targetCompanies', [...watchedCompanies, trimmedInput]);
      setCompanyInput('');
    }
  };

  const handleRemoveCompany = (company: string) => {
    setValue('targetCompanies', watchedCompanies.filter((companyItem) => companyItem !== company));
  };

  const handleCompanyKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddCompany();
    }
  };

  const toggleWorkArrangement = (arrangement: string) => {
    const current = getValues('workArrangements');
    setValue(
      'workArrangements',
      current.includes(arrangement)
        ? current.filter((item) => item !== arrangement)
        : [...current, arrangement]
    );
  };

  const toggleJobType = (jobType: string) => {
    const current = getValues('preferredJobTypes');
    setValue(
      'preferredJobTypes',
      current.includes(jobType)
        ? current.filter((item) => item !== jobType)
        : [...current, jobType]
    );
  };

  const onSubmit = async (formData: CareerPreferencesFormData) => {
    try {
      await settingsService.updateCareerPreferences({
        targetRole: formData.targetRole || null,
        jobTitle: formData.targetRole || null,
        experienceLevel: formData.experienceLevel || null,
        targetCompanies: formData.targetCompanies,
        country: formData.country || null,
        region: formData.region || null,
        salaryMin: formData.salaryMin ? parseInt(formData.salaryMin, 10) : null,
        salaryMax: formData.salaryMax ? parseInt(formData.salaryMax, 10) : null,
        workArrangements: formData.workArrangements,
        preferredJobTypes: formData.preferredJobTypes,
      });
      showSuccessToast('Your career preferences have been updated.');
    } catch {
      showErrorToast('Failed to save preferences. Please try again.');
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

  const regionOptions = LOCATION_OPTIONS[watchedCountry] || [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Career Preferences</CardTitle>
          <CardDescription>Configure your job search preferences and target roles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="target-role">Target Role</Label>
                <Controller
                  control={control}
                  name="targetRole"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="target-role">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_TITLE_OPTIONS.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience-level">Experience Level</Label>
                <Controller
                  control={control}
                  name="experienceLevel"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="experience-level">
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPERIENCE_LEVEL_OPTIONS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label} ({level.description})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Target Companies</Label>
              <div className="flex flex-wrap gap-2">
                {watchedCompanies.map((company) => (
                  <Badge key={company} variant="secondary" className="gap-1 pr-1">
                    {company}
                    <button
                      type="button"
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
                    type="button"
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
                <Controller
                  control={control}
                  name="country"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
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
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Controller
                  control={control}
                  name="region"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!watchedCountry || regionOptions.length === 0}
                    >
                      <SelectTrigger id="region">
                        <SelectValue placeholder={watchedCountry ? 'Select a region' : 'Select a country first'} />
                      </SelectTrigger>
                      <SelectContent>
                        {regionOptions.map((regionOption) => (
                          <SelectItem key={regionOption.value} value={regionOption.value}>
                            {regionOption.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Salary Expectation</Label>
              <div className="flex items-center gap-2 max-w-md">
                <Input
                  {...register('salaryMin')}
                  placeholder="Min"
                  type="number"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  {...register('salaryMax')}
                  placeholder="Max"
                  type="number"
                />
              </div>
              {errors.salaryMin && (
                <p className="text-sm text-destructive">{errors.salaryMin.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label>Work Arrangement</Label>
              <div className="flex gap-4">
                {WORK_ARRANGEMENT_OPTIONS.map((arrangement) => (
                  <label key={arrangement} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={watchedWorkArrangements.includes(arrangement)}
                      onChange={() => toggleWorkArrangement(arrangement)}
                      className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-foreground">{arrangement}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Job Type</Label>
              <div className="flex flex-wrap gap-4">
                {JOB_TYPE_OPTIONS.map((jobType) => (
                  <label key={jobType} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={watchedJobTypes.includes(jobType)}
                      onChange={() => toggleJobType(jobType)}
                      className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-foreground">{jobType}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Preferences'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
