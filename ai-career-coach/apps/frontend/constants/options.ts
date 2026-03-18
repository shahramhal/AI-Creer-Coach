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
] as const;

export const WORK_ARRANGEMENT_OPTIONS = ['Remote', 'Hybrid', 'On-site'] as const;
