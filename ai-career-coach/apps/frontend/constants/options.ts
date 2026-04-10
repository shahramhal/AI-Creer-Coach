// Static list used by salary insights and settings pages.
// The job filter (JobFilters.tsx) uses a dynamic list fetched from /api/v1/jobs/countries
// so it only shows countries that actually have job data configured in the backend.
export const COUNTRY_OPTIONS = [
  { value: 'gb', label: 'United Kingdom' },
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
  { value: 'au', label: 'Australia' },
  { value: 'nl', label: 'Netherlands' },
  { value: 'in', label: 'India' },
  { value: 'sg', label: 'Singapore' },
  { value: 'at', label: 'Austria' },
  { value: 'be', label: 'Belgium' },
  { value: 'br', label: 'Brazil' },
  { value: 'it', label: 'Italy' },
  { value: 'pl', label: 'Poland' },
  { value: 'za', label: 'South Africa' },
] as const;

export const JOB_TYPE_OPTIONS = [
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
  'Temporary',
] as const;

export const EXPERIENCE_LEVEL_OPTIONS = [
  { value: 'Junior', label: 'Junior', description: '0-3 years' },
  { value: 'Mid-level', label: 'Mid-Level', description: '3-5 years' },
  { value: 'Senior', label: 'Senior', description: '5+ years' },
  { value: 'Director+', label: 'Director / Executive', description: 'Leadership roles' },
] as const;

export const WORK_ARRANGEMENT_OPTIONS = ['Remote', 'Hybrid', 'On-site'] as const;
