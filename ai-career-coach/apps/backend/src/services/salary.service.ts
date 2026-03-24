import mongoose from 'mongoose';
import { prisma, cache } from '../config/database.js';
import { AppError, ErrorCodes } from '../utils/app-error.util.js';

const ADZUNA_BASE_URL = 'https://api.adzuna.com/v1/api';
const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || '';
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || '';
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const SUPPORTED_COUNTRIES = new Set(['gb', 'us', 'de', 'fr', 'nl', 'au', 'ca']);

const SKILL_PREMIUMS: Record<string, { premiumRate: number; learningTime: string; demandTrend: number }> = {
  'aws': { premiumRate: 0.36, learningTime: '40 hours', demandTrend: 45 },
  'kubernetes': { premiumRate: 0.30, learningTime: '60 hours', demandTrend: 38 },
  'k8s': { premiumRate: 0.30, learningTime: '60 hours', demandTrend: 38 },
  'react': { premiumRate: 0.16, learningTime: '30 hours', demandTrend: 25 },
  'react.js': { premiumRate: 0.16, learningTime: '30 hours', demandTrend: 25 },
  'reactjs': { premiumRate: 0.16, learningTime: '30 hours', demandTrend: 25 },
  'typescript': { premiumRate: 0.20, learningTime: '20 hours', demandTrend: 52 },
  'python': { premiumRate: 0.24, learningTime: '40 hours', demandTrend: 35 },
  'docker': { premiumRate: 0.20, learningTime: '25 hours', demandTrend: 40 },
  'graphql': { premiumRate: 0.24, learningTime: '20 hours', demandTrend: 52 },
  'rust': { premiumRate: 0.40, learningTime: '100 hours', demandTrend: 28 },
  'system design': { premiumRate: 0.50, learningTime: '80 hours', demandTrend: 65 },
  'machine learning': { premiumRate: 0.44, learningTime: '120 hours', demandTrend: 55 },
  'ml': { premiumRate: 0.44, learningTime: '120 hours', demandTrend: 55 },
  'node.js': { premiumRate: 0.16, learningTime: '30 hours', demandTrend: 20 },
  'nodejs': { premiumRate: 0.16, learningTime: '30 hours', demandTrend: 20 },
  'node': { premiumRate: 0.16, learningTime: '30 hours', demandTrend: 20 },
  'go': { premiumRate: 0.30, learningTime: '60 hours', demandTrend: 42 },
  'golang': { premiumRate: 0.30, learningTime: '60 hours', demandTrend: 42 },
  'terraform': { premiumRate: 0.28, learningTime: '40 hours', demandTrend: 48 },
  'ci/cd': { premiumRate: 0.16, learningTime: '20 hours', demandTrend: 30 },
  'cicd': { premiumRate: 0.16, learningTime: '20 hours', demandTrend: 30 },
  'sql': { premiumRate: 0.10, learningTime: '15 hours', demandTrend: 15 },
  'postgresql': { premiumRate: 0.12, learningTime: '20 hours', demandTrend: 18 },
  'mongodb': { premiumRate: 0.12, learningTime: '20 hours', demandTrend: 22 },
  'redis': { premiumRate: 0.14, learningTime: '15 hours', demandTrend: 25 },
  'java': { premiumRate: 0.20, learningTime: '60 hours', demandTrend: 15 },
  'c#': { premiumRate: 0.20, learningTime: '60 hours', demandTrend: 12 },
  'azure': { premiumRate: 0.32, learningTime: '50 hours', demandTrend: 40 },
  'gcp': { premiumRate: 0.28, learningTime: '45 hours', demandTrend: 35 },
  'google cloud': { premiumRate: 0.28, learningTime: '45 hours', demandTrend: 35 },
  'next.js': { premiumRate: 0.20, learningTime: '25 hours', demandTrend: 48 },
  'nextjs': { premiumRate: 0.20, learningTime: '25 hours', demandTrend: 48 },
  'vue': { premiumRate: 0.14, learningTime: '25 hours', demandTrend: 18 },
  'vue.js': { premiumRate: 0.14, learningTime: '25 hours', demandTrend: 18 },
  'angular': { premiumRate: 0.16, learningTime: '40 hours', demandTrend: 10 },
  'kafka': { premiumRate: 0.30, learningTime: '50 hours', demandTrend: 35 },
  'elasticsearch': { premiumRate: 0.24, learningTime: '40 hours', demandTrend: 25 },
  'microservices': { premiumRate: 0.24, learningTime: '60 hours', demandTrend: 30 },
  'devops': { premiumRate: 0.30, learningTime: '80 hours', demandTrend: 42 },
  'linux': { premiumRate: 0.10, learningTime: '40 hours', demandTrend: 12 },
  'git': { premiumRate: 0.04, learningTime: '10 hours', demandTrend: 8 },
  'javascript': { premiumRate: 0.10, learningTime: '30 hours', demandTrend: 10 },
  'html': { premiumRate: 0.04, learningTime: '10 hours', demandTrend: 5 },
  'css': { premiumRate: 0.04, learningTime: '15 hours', demandTrend: 5 },
};

// Adzuna location0 value per country code (the top-level area name)
const COUNTRY_LOCATION0: Record<string, string> = {
  gb: 'UK',
  us: 'US',
  de: 'Deutschland',
  fr: 'France',
  nl: 'Nederland',
  au: 'Australia',
  ca: 'Canada',
};

// Regional locations with proper Adzuna location1 values for comparison charts
// Synced with frontend LOCATION_OPTIONS in apps/frontend/app/salary-insights/page.tsx
const REGIONAL_LOCATIONS: Record<string, Array<{ label: string; location1: string }>> = {
  gb: [
    { label: 'London', location1: 'London' },
    { label: 'South East England', location1: 'South East England' },
    { label: 'North West England', location1: 'North West England' },
    { label: 'West Midlands', location1: 'West Midlands' },
    { label: 'Scotland', location1: 'Scotland' },
    { label: 'East of England', location1: 'East of England' },
    { label: 'South West England', location1: 'South West England' },
    { label: 'East Midlands', location1: 'East Midlands' },
    { label: 'North East England', location1: 'North East England' },
    { label: 'Yorkshire', location1: 'Yorkshire and The Humber' },
    { label: 'Wales', location1: 'Wales' },
    { label: 'Northern Ireland', location1: 'Northern Ireland' },
  ],
  us: [
    { label: 'New York', location1: 'New York' },
    { label: 'California', location1: 'California' },
    { label: 'Texas', location1: 'Texas' },
    { label: 'Washington', location1: 'Washington State' },
    { label: 'Massachusetts', location1: 'Massachusetts' },
    { label: 'Illinois', location1: 'Illinois' },
    { label: 'Pennsylvania', location1: 'Pennsylvania' },
    { label: 'Colorado', location1: 'Colorado' },
    { label: 'Georgia', location1: 'Georgia' },
    { label: 'Florida', location1: 'Florida' },
  ],
  de: [
    { label: 'Berlin', location1: 'Berlin' },
    { label: 'Bayern', location1: 'Bayern' },
    { label: 'Hamburg', location1: 'Hamburg' },
    { label: 'Hessen', location1: 'Hessen' },
    { label: 'NRW', location1: 'Nordrhein-Westfalen' },
    { label: 'Baden-Württemberg', location1: 'Baden-Württemberg' },
    { label: 'Sachsen', location1: 'Sachsen' },
  ],
  fr: [
    { label: 'Île-de-France', location1: 'Île-de-France' },
    { label: 'Auvergne-Rhône-Alpes', location1: 'Auvergne-Rhône-Alpes' },
    { label: 'Provence-Alpes-Côte d\'Azur', location1: 'Provence-Alpes-Côte d\'Azur' },
  ],
  nl: [
    { label: 'Noord-Holland', location1: 'Noord-Holland' },
    { label: 'Zuid-Holland', location1: 'Zuid-Holland' },
    { label: 'Noord-Brabant', location1: 'Noord-Brabant' },
  ],
  au: [
    { label: 'New South Wales', location1: 'New South Wales' },
    { label: 'Victoria', location1: 'Victoria' },
    { label: 'Queensland', location1: 'Queensland' },
    { label: 'Western Australia', location1: 'Western Australia' },
  ],
  ca: [
    { label: 'Ontario', location1: 'Ontario' },
    { label: 'British Columbia', location1: 'British Columbia' },
    { label: 'Alberta', location1: 'Alberta' },
    { label: 'Quebec', location1: 'Québec' },
  ],
};

const CURRENCY_MAP: Record<string, string> = {
  gb: '£', us: '$', de: '€', fr: '€', nl: '€', au: 'A$', ca: 'C$',
};

// Maps Adzuna region names → ML model location format
const ADZUNA_TO_ML_LOCATION: Record<string, Record<string, string>> = {
  us: {
    'California': 'CA', 'New York': 'NY', 'Texas': 'TX',
    'Washington State': 'WA', 'Massachusetts': 'MA', 'Illinois': 'IL',
    'Pennsylvania': 'PA', 'Colorado': 'CO', 'Georgia': 'GA', 'Florida': 'FL',
  },
  gb: {
    'London': 'London', 'South East England': 'London',
    'North West England': 'Manchester', 'West Midlands': 'Birmingham',
    'Scotland': 'Edinburgh', 'East of England': 'Cambridge',
    'South West England': 'Bristol', 'East Midlands': 'Nottingham',
    'North East England': 'Newcastle', 'Yorkshire and The Humber': 'Leeds',
    'Wales': 'Cardiff', 'Northern Ireland': 'Belfast',
  },
};

const ROLE_VARIANTS: Record<string, string[]> = {
  'Software Engineer': ['Senior Software Engineer', 'Staff Engineer', 'Principal Engineer', 'Engineering Manager', 'Solutions Architect', 'DevOps Engineer', 'Cloud Architect', 'Site Reliability Engineer'],
  'Data Scientist': ['Senior Data Scientist', 'Machine Learning Engineer', 'Data Engineering Manager', 'AI Researcher', 'Principal Data Scientist', 'MLOps Engineer', 'Analytics Manager', 'Head of Data'],
  'Frontend Developer': ['Senior Frontend Developer', 'Lead Frontend Engineer', 'UI Architect', 'Full Stack Developer', 'Frontend Engineering Manager', 'UX Engineer', 'Design Technologist', 'Mobile Developer'],
  'Backend Developer': ['Senior Backend Developer', 'Lead Backend Engineer', 'Platform Engineer', 'API Developer', 'Systems Engineer', 'Microservices Architect', 'Backend Engineering Manager', 'Infrastructure Engineer'],
  'DevOps Engineer': ['Senior DevOps Engineer', 'Site Reliability Engineer', 'Platform Engineer', 'Cloud Architect', 'Infrastructure Manager', 'DevOps Lead', 'Release Engineer', 'Systems Administrator'],
  'Product Manager': ['Senior Product Manager', 'Director of Product', 'VP of Product', 'Chief Product Officer', 'Technical Product Manager', 'Group Product Manager', 'Product Lead', 'Head of Product'],
};

const ROLE_RELATED_TERMS: Record<string, string[]> = {
  frontend: ['frontend', 'front-end', 'front end', 'ui', 'ux', 'react', 'angular', 'vue', 'css', 'html', 'web developer', 'web engineer'],
  backend: ['backend', 'back-end', 'back end', 'server', 'api', 'node', 'java', 'python', 'django', 'express', 'spring', 'microservice'],
  devops: ['devops', 'sre', 'reliability', 'infrastructure', 'platform', 'cloud', 'aws', 'azure', 'gcp', 'kubernetes', 'docker', 'ci/cd'],
  data: ['data scientist', 'data analyst', 'machine learning', 'ml engineer', 'data engineer', 'analytics', 'ai researcher'],
  product: ['product manager', 'product owner', 'scrum master', 'agile coach', 'program manager'],
  fullstack: ['full stack', 'full-stack', 'fullstack'],
};

// Experience adjustment relative to the market median.
// The Adzuna median already reflects the "average" listed salary, which includes
// a mix of experience levels. We model the average listing as ~5 years experience.
// Candidates below that get a negative adjustment; above get positive.
//   raw(years) = 0.15 * ln(years + 1)       ← Mincer log curve
//   baseline   = 0.15 * ln(5 + 1) ≈ 0.269   ← what the "average" worker has
//   adjustment = raw - baseline               ← centered: 0yr ≈ -27%, 5yr ≈ 0%, 15yr ≈ +15%
// Clamped to [-0.27, +0.20] to avoid extreme swings.
const EXPERIENCE_BASELINE = 0.15 * Math.log(5 + 1); // ~0.269

interface MLPredictionResult {
  predicted_salary: number;
  salary_range: { min: number; max: number };
  confidence: number;
  currency_symbol: string;
  factors?: Array<{ factor: string; description: string; impact: string; value?: string }>;
  skill_analysis?: {
    matched_high_value_skills: string[];
    suggested_skills_to_learn: string[];
    total_matched: number;
    note: string;
  };
}

interface SkillRelevanceResult {
  skill_scores: Array<{ skill: string; relevance: number }>;
  overall_relevance: number;
}

async function fetchMLPrediction(
  jobTitle: string,
  country: string,
  location: string,
  cvSkills: string[]
): Promise<MLPredictionResult | null> {
  const mlCountryCode = country === 'gb' ? 'UK' : country === 'us' ? 'US' : null;
  if (!mlCountryCode) return null;

  const locationMapping = ADZUNA_TO_ML_LOCATION[country] || {};
  const mlLocation = locationMapping[location] || (country === 'us' ? 'CA' : 'London');

  try {
    const response = await fetch(`${ML_SERVICE_URL}/api/ml/predict-salary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_title: jobTitle,
        country: mlCountryCode,
        location: mlLocation,
        skills: cvSkills,
        include_factors: true,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error(`[Salary] ML service error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Salary] ML service unreachable, falling back to Adzuna:', error);
    return null;
  }
}

async function fetchSkillRelevance(
  jobTitle: string,
  skills: string[]
): Promise<SkillRelevanceResult | null> {
  if (!skills || skills.length === 0) return null;

  try {
    const response = await fetch(`${ML_SERVICE_URL}/api/ml/skill-relevance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_title: jobTitle, skills }),
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      console.error(`[Salary] Skill relevance API error: ${response.status}`);
      return null;
    }

    const result = await response.json();
    return result.data || null;
  } catch (error) {
    console.error('[Salary] Skill relevance service unreachable:', error);
    return null;
  }
}

async function fetchTopPayingRoles(
  country: string,
  jobTitle: string,
  countryLoc0: string,
): Promise<Array<{ role: string; avgSalary: number }>> {
  const normalizedTitle = Object.keys(ROLE_VARIANTS).find(
    key => jobTitle.toLowerCase().includes(key.toLowerCase())
  );
  const variants = normalizedTitle
    ? ROLE_VARIANTS[normalizedTitle]!
    : ['Senior ' + jobTitle, 'Lead ' + jobTitle, 'Principal ' + jobTitle, 'Staff ' + jobTitle, jobTitle + ' Manager', 'Chief ' + jobTitle];

  const results: Array<{ role: string; avgSalary: number }> = [];

  for (const roleVariant of variants) {
    if (results.length >= 6) break;

    // Throttle between calls
    if (results.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const histogram = await fetchAdzunaHistogram(country, roleVariant, countryLoc0);
    const median = computeMedianFromHistogram(histogram);
    if (median > 0) {
      results.push({ role: roleVariant, avgSalary: median });
    }
  }

  results.sort((a, b) => b.avgSalary - a.avgSalary);
  return results.slice(0, 6);
}

async function fetchAdzunaHistogram(
  country: string,
  jobTitle: string,
  location0?: string,
  location1?: string
): Promise<Record<string, number>> {
  const params = new URLSearchParams({
    app_id: ADZUNA_APP_ID,
    app_key: ADZUNA_APP_KEY,
    what: jobTitle,
    'content-type': 'application/json',
  });
  if (location0) {
    params.set('location0', location0);
    if (location1) {
      params.set('location1', location1);
    }
  }

  try {
    const url = `${ADZUNA_BASE_URL}/jobs/${country}/histogram?${params}`;
    console.log(`[Salary] Fetching histogram: ${url.replace(ADZUNA_APP_KEY, '***')}`);
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[Salary] Histogram API error: ${response.status} for ${location0}/${location1}`);
      return {};
    }
    const data = await response.json();
    return data.histogram || {};
  } catch (error) {
    console.error('[Salary] Histogram fetch error:', error);
    return {};
  }
}

async function fetchAdzunaHistory(
  country: string,
  jobTitle: string,
  location0?: string,
  location1?: string
): Promise<Record<string, number>> {
  const params = new URLSearchParams({
    app_id: ADZUNA_APP_ID,
    app_key: ADZUNA_APP_KEY,
    what: jobTitle,
    'content-type': 'application/json',
  });
  if (location0) {
    params.set('location0', location0);
    if (location1) {
      params.set('location1', location1);
    }
  }

  try {
    const url = `${ADZUNA_BASE_URL}/jobs/${country}/history?${params}`;
    console.log(`[Salary] Fetching history: ${url.replace(ADZUNA_APP_KEY, '***')}`);
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[Salary] History API error: ${response.status}`);
      return {};
    }
    const data = await response.json();
    return data.month || {};
  } catch (error) {
    console.error('[Salary] History fetch error:', error);
    return {};
  }
}

/**
 * Fetch histograms for a batch of regions sequentially with a small delay
 * between each call to avoid hitting Adzuna's rate limit (429).
 */
async function fetchRegionalHistogramsThrottled(
  country: string,
  jobTitle: string,
  location0: string,
  regions: Array<{ label: string; location1: string }>,
  existingResults: Map<string, Record<string, number>>,
  delayMs: number = 200
): Promise<Record<string, number>[]> {
  const results: Record<string, number>[] = [];

  for (const region of regions) {
    // Reuse already-fetched histogram (e.g. user's location overlaps a region)
    const existing = existingResults.get(region.location1);
    if (existing) {
      results.push(existing);
      continue;
    }

    // Small delay between calls to stay under rate limit
    if (results.length > 0 || existingResults.size > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    const histogram = await fetchAdzunaHistogram(country, jobTitle, location0, region.location1);
    results.push(histogram);
  }

  return results;
}

function computeMedianFromHistogram(histogram: Record<string, number>): number {
  const buckets = Object.entries(histogram)
    .map(([salary, count]) => ({ salary: parseInt(salary), count: Number(count) }))
    .sort((a, b) => a.salary - b.salary);

  if (buckets.length === 0) return 0;

  const totalCount = buckets.reduce((sum, b) => sum + b.count, 0);
  const medianIndex = totalCount / 2;
  let runningCount = 0;

  for (const bucket of buckets) {
    runningCount += bucket.count;
    if (runningCount >= medianIndex) {
      return bucket.salary;
    }
  }

  return buckets[buckets.length - 1]?.salary ?? 0;
}

function computePercentilesFromHistogram(
  histogram: Record<string, number>,
  p25Target: number = 0.25,
  p75Target: number = 0.75
): { p25: number; p75: number } | null {
  const buckets = Object.entries(histogram)
    .map(([salary, count]) => ({ salary: parseInt(salary), count: Number(count) }))
    .sort((a, b) => a.salary - b.salary);

  if (buckets.length < 2) return null;

  const totalCount = buckets.reduce((sum, b) => sum + b.count, 0);
  if (totalCount === 0) return null;

  let p25: number | null = null;
  let p75: number | null = null;
  let runningCount = 0;

  for (const bucket of buckets) {
    runningCount += bucket.count;
    if (p25 === null && runningCount >= totalCount * p25Target) {
      p25 = bucket.salary;
    }
    if (p75 === null && runningCount >= totalCount * p75Target) {
      p75 = bucket.salary;
    }
  }

  return (p25 !== null && p75 !== null) ? { p25, p75 } : null;
}

function computeConfidence(histogram: Record<string, number>): number {
  const buckets = Object.entries(histogram)
    .map(([salary, count]) => ({ salary: parseInt(salary), count: Number(count) }))
    .filter(b => b.count > 0);

  if (buckets.length === 0) return 40;

  const totalCount = buckets.reduce((sum, b) => sum + b.count, 0);

  // Sample size score: 200+ listings = full score (50 points)
  const sampleScore = Math.min(50, (totalCount / 200) * 50);

  // Distribution tightness: coefficient of variation (std dev / mean)
  const weightedSum = buckets.reduce((sum, b) => sum + b.salary * b.count, 0);
  const mean = weightedSum / totalCount;

  if (mean === 0) return 40;

  const variance = buckets.reduce(
    (sum, b) => sum + b.count * Math.pow(b.salary - mean, 2),
    0
  ) / totalCount;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / mean;

  // Lower CV = tighter distribution = higher confidence (up to 45 points)
  // CV threshold: salary distributions for a single job title typically have CV < 1.0;
  // CV of 1.0 means std dev equals mean, implying data is too noisy to be useful.
  const tightnessScore = Math.max(0, 45 * (1 - coefficientOfVariation / 1.0));

  return Math.min(95, Math.max(40, Math.round(sampleScore + tightnessScore)));
}

function calculateYearsOfExperience(experience: any[], targetJobTitle?: string): number {
  if (!experience || experience.length === 0) return 0;

  let targetCategory: string | null = null;
  if (targetJobTitle) {
    const titleLower = targetJobTitle.toLowerCase();
    for (const [category, terms] of Object.entries(ROLE_RELATED_TERMS)) {
      if (terms.some(term => titleLower.includes(term))) {
        targetCategory = category;
        break;
      }
    }
  }

  let totalMonths = 0;
  for (const exp of experience) {
    const startDate = exp.startDate || exp.dates?.split(/[-–]/)[0]?.trim();
    const endDate = exp.endDate || exp.dates?.split(/[-–]/)[1]?.trim() || 'Present';

    if (!startDate) continue;

    const startYear = parseInt(startDate.match(/\d{4}/)?.[0] || '0');
    const endYear = endDate.toLowerCase().includes('present')
      ? new Date().getFullYear()
      : parseInt(endDate.match(/\d{4}/)?.[0] || String(new Date().getFullYear()));

    if (startYear > 0) {
      const rawMonths = Math.max(0, (endYear - startYear) * 12);

      let weight = 1.0;
      if (targetCategory) {
        const expText = ((exp.title || '') + ' ' + (exp.description || '')).toLowerCase();
        const terms = ROLE_RELATED_TERMS[targetCategory] || [];
        const hasRelevantTitle = terms.some(term => expText.includes(term));

        if (hasRelevantTitle) {
          weight = 1.0;
        } else {
          const isLooselyRelated = Object.entries(ROLE_RELATED_TERMS).some(
            ([cat, catTerms]) => cat !== targetCategory && catTerms.some(term => expText.includes(term))
          );
          weight = isLooselyRelated ? 0.3 : 0.1;
        }
      }

      totalMonths += rawMonths * weight;
    }
  }

  return Math.round(totalMonths / 12);
}

function getExperienceMultiplier(years: number): number {
  if (years <= 0) return -EXPERIENCE_BASELINE; // 0 years → ~-27%
  const raw = 0.15 * Math.log(years + 1);
  return Math.max(-0.27, Math.min(0.20, raw - EXPERIENCE_BASELINE));
}

function getEducationMultiplier(education: any[]): number {
  if (!education || education.length === 0) return 0;

  const degreeKeywords = education.map(e =>
    ((e.degree || '') + ' ' + (e.field || '')).toLowerCase()
  );

  for (const deg of degreeKeywords) {
    if (deg.includes('phd') || deg.includes('doctorate') || deg.includes('d.phil')) return 0.15;
  }
  for (const deg of degreeKeywords) {
    if (deg.includes('master') || deg.includes('msc') || deg.includes('mba') || deg.includes('m.eng')) return 0.08;
  }
  for (const deg of degreeKeywords) {
    if (deg.includes('bachelor') || deg.includes('bsc') || deg.includes('b.eng') || deg.includes('ba ') || deg.includes('degree')) return 0;
  }

  return 0;
}

function calculateSkillsPremium(
  skills: string[],
  baseSalary: number,
  skillRelevanceMap?: Map<string, number>
): number {
  if (!skills || skills.length === 0 || baseSalary <= 0) return 0;

  const matchedEntries: { normalizedSkill: string; premiumRate: number }[] = [];
  const seenSkills = new Set<string>();

  for (const userSkill of skills) {
    const normalizedSkill = userSkill.toLowerCase().trim();
    const premiumData = SKILL_PREMIUMS[normalizedSkill];
    if (premiumData && !seenSkills.has(normalizedSkill)) {
      seenSkills.add(normalizedSkill);
      const relevanceWeight = skillRelevanceMap?.get(normalizedSkill) ?? 1.0;
      const effectivePremiumRate = premiumData.premiumRate * relevanceWeight;
      matchedEntries.push({ normalizedSkill, premiumRate: effectivePremiumRate });
    }
  }

  matchedEntries.sort((a, b) => b.premiumRate - a.premiumRate);

  let totalPremium = 0;
  const maxContributingSkills = Math.min(matchedEntries.length, 5);
  for (let i = 0; i < maxContributingSkills; i++) {
    const diminishingFactor = 1 / (1 + i * 0.5);
    totalPremium += baseSalary * matchedEntries[i]!.premiumRate * diminishingFactor;
  }

  return Math.min(totalPremium, baseSalary * 0.20);
}

function buildSkillROI(skills: string[], baseSalary: number): any[] {
  if (!skills || skills.length === 0) return [];

  const roiEntries: any[] = [];
  const seenSkills = new Set<string>();

  for (const userSkill of skills) {
    const normalizedSkill = userSkill.toLowerCase().trim();
    const premiumData = SKILL_PREMIUMS[normalizedSkill];

    if (premiumData && !seenSkills.has(normalizedSkill)) {
      seenSkills.add(normalizedSkill);

      let priority: 'High' | 'Medium' | 'Low' = 'Low';
      if (premiumData.premiumRate > 0.24 || premiumData.demandTrend > 45) {
        priority = 'High';
      } else if (premiumData.premiumRate > 0.16 || premiumData.demandTrend > 30) {
        priority = 'Medium';
      }

      roiEntries.push({
        skill: userSkill,
        avgSalaryIncrease: Math.round(baseSalary * premiumData.premiumRate),
        learningTime: premiumData.learningTime,
        demandTrend: premiumData.demandTrend,
        priority,
      });
    }
  }

  roiEntries.sort((a, b) => b.avgSalaryIncrease - a.avgSalaryIncrease);
  return roiEntries.slice(0, 10);
}

function buildMissingSkills(
  mlSkillAnalysis: MLPredictionResult['skill_analysis'] | undefined,
  cvSkills: string[],
  dataSource: 'ml' | 'adzuna'
): Array<{ skill: string; importance: 'High' | 'Medium' | 'Low'; learnUrl: string }> {
  const buildLearnUrl = (skill: string) =>
    `https://www.udemy.com/courses/search/?q=${encodeURIComponent(skill)}`;

  if (dataSource === 'ml' && mlSkillAnalysis?.suggested_skills_to_learn) {
    return mlSkillAnalysis.suggested_skills_to_learn.map((skill, index) => ({
      skill,
      importance: (index < 2 ? 'High' : index < 4 ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low',
      learnUrl: buildLearnUrl(skill),
    }));
  }

  // Adzuna fallback: derive from SKILL_PREMIUMS minus user's CV skills
  const userSkillsLower = new Set(cvSkills.map(s => s.toLowerCase().trim()));
  const missingEntries: Array<{ skill: string; premiumRate: number; demandTrend: number }> = [];
  const seenSkills = new Set<string>();

  for (const [skillKey, premiumData] of Object.entries(SKILL_PREMIUMS)) {
    if (!userSkillsLower.has(skillKey) && !seenSkills.has(skillKey)) {
      seenSkills.add(skillKey);
      missingEntries.push({ skill: skillKey, premiumRate: premiumData.premiumRate, demandTrend: premiumData.demandTrend });
    }
  }

  missingEntries.sort((a, b) => b.premiumRate - a.premiumRate);

  return missingEntries.slice(0, 8).map(entry => {
    let importance: 'High' | 'Medium' | 'Low' = 'Low';
    if (entry.premiumRate > 0.24 || entry.demandTrend > 45) importance = 'High';
    else if (entry.premiumRate > 0.16 || entry.demandTrend > 30) importance = 'Medium';

    return {
      skill: entry.skill,
      importance,
      learnUrl: buildLearnUrl(entry.skill),
    };
  });
}

export class SalaryService {
  async getSalaryInsights(userId: string, jobTitle: string, location: string, country: string) {
    const startTime = Date.now();

    if (!jobTitle) {
      throw new AppError(
        'Job title is required. Please provide a job title to get salary insights.',
        400,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    if (!SUPPORTED_COUNTRIES.has(country)) {
      throw new AppError(
        `Unsupported country code. Supported values: ${[...SUPPORTED_COUNTRIES].join(', ')}`,
        400,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
      throw new AppError(
        'Salary service is not configured. Please set ADZUNA_APP_ID and ADZUNA_APP_KEY.',
        503,
        ErrorCodes.INTERNAL_ERROR
      );
    }

    // Check Redis cache
    const cacheKey = `salary:user:${userId}:job:${jobTitle.toLowerCase()}:loc:${location.toLowerCase()}:country:${country}`;
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      console.log(`[Salary] Cache HIT for user: ${userId}`);
      return cachedResult;
    }

    console.log(`[Salary] Generating insights for user: ${userId}, job: ${jobTitle}, loc: ${location}`);

    // Fetch user CV data from MongoDB
    let cvSkills: string[] = [];
    let cvExperience: any[] = [];
    let cvEducation: any[] = [];

    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      const cvCollection = mongoose.connection.db.collection('parsed_cvs');
      const userCV = await cvCollection.findOne(
        { user_id: userId },
        { sort: { created_at: -1 } }
      );

      if (userCV) {
        cvSkills = userCV.skills || [];
        cvExperience = userCV.experience || [];
        cvEducation = userCV.education || [];
        console.log(`[Salary] Found CV with ${cvSkills.length} skills, ${cvExperience.length} experiences`);
      }
    }

    // Resolve Adzuna location hierarchy
    const countryLoc0 = COUNTRY_LOCATION0[country] || 'UK';
    const regions = REGIONAL_LOCATIONS[country] || REGIONAL_LOCATIONS['gb'] || [];
    const currency = CURRENCY_MAP[country] || '£';

    // Resolve user's location to a valid Adzuna location1
    let userLocation1: string | undefined;
    if (location) {
      const matchedRegion = regions.find(r =>
        r.label.toLowerCase() === location.toLowerCase() ||
        r.location1.toLowerCase() === location.toLowerCase()
      );
      userLocation1 = matchedRegion ? matchedRegion.location1 : location;
    }

    // ── Determine if ML prediction is available for this country ──
    const isMLCountry = country === 'gb' || country === 'us';
    let mlPrediction: MLPredictionResult | null = null;
    let dataSource: 'ml' | 'adzuna' = 'adzuna';

    // ── Phase 1: Fetch critical data (national + user location + history) ──
    // Also attempt ML prediction in parallel for UK/US
    const hasLocationQuery = !!userLocation1;
    const [nationalHistogram, locationHistogram, historyData, mlResult, skillRelevanceResult] = await Promise.all([
      fetchAdzunaHistogram(country, jobTitle, countryLoc0),
      hasLocationQuery
        ? fetchAdzunaHistogram(country, jobTitle, countryLoc0, userLocation1)
        : Promise.resolve({} as Record<string, number>),
      fetchAdzunaHistory(country, jobTitle, countryLoc0),
      isMLCountry
        ? fetchMLPrediction(jobTitle, country, userLocation1 || '', cvSkills)
        : Promise.resolve(null),
      fetchSkillRelevance(jobTitle, cvSkills.slice(0, 50)),
    ]);

    // Build skill relevance map for weighting
    const skillRelevanceMap = new Map<string, number>();
    let overallRelevance = 0;
    let relevantSkillsCount = 0;
    if (skillRelevanceResult) {
      overallRelevance = skillRelevanceResult.overall_relevance;
      for (const entry of skillRelevanceResult.skill_scores) {
        skillRelevanceMap.set(entry.skill.toLowerCase().trim(), entry.relevance);
        if (entry.relevance >= 0.5) relevantSkillsCount++;
      }
      console.log(`[Salary] Skill relevance: overall=${overallRelevance}, relevant=${relevantSkillsCount}/${cvSkills.length}`);
    }

    if (mlResult) {
      mlPrediction = mlResult;
      dataSource = 'ml';
      console.log(`[Salary] ML prediction received: ${mlResult.currency_symbol}${mlResult.predicted_salary}`);
    }

    // Calculate base salary from national histogram
    const nationalMedian = computeMedianFromHistogram(nationalHistogram);
    const locationMedian = hasLocationQuery ? computeMedianFromHistogram(locationHistogram) : 0;

    // National median is the base — it represents the average listing for this role.
    const effectiveBase = nationalMedian;
    const effectiveHistogram = (hasLocationQuery && locationMedian > 0) ? locationHistogram : nationalHistogram;

    if (effectiveBase === 0 && !mlPrediction) {
      throw new AppError(
        `No salary data found for "${jobTitle}" in ${country.toUpperCase()}. Try a different job title.`,
        404,
        ErrorCodes.NOT_FOUND
      );
    }

    // ── Phase 2: Fetch regional histograms + top-paying roles (throttled) ──
    const alreadyFetched = new Map<string, Record<string, number>>();
    if (hasLocationQuery && userLocation1 && locationMedian > 0) {
      alreadyFetched.set(userLocation1, locationHistogram);
    }

    const [regionalHistograms, topPayingRoles] = await Promise.all([
      fetchRegionalHistogramsThrottled(country, jobTitle, countryLoc0, regions, alreadyFetched),
      fetchTopPayingRoles(country, jobTitle, countryLoc0),
    ]);

    // ── Calculate prediction values ──
    let predictedSalary: number;
    let salaryMin: number;
    let salaryMax: number;
    let confidence: number;
    let vsMarketAvg: number;
    let factorBreakdown: Array<{ factor: string; amount: number; color: string }>;

    if (dataSource === 'ml' && mlPrediction) {
      // Use ML prediction for UK/US
      predictedSalary = mlPrediction.predicted_salary;
      salaryMin = mlPrediction.salary_range.min;
      salaryMax = mlPrediction.salary_range.max;
      confidence = mlPrediction.confidence;
      vsMarketAvg = effectiveBase > 0
        ? Math.round(((predictedSalary - effectiveBase) / effectiveBase) * 100)
        : 0;

      // Build factor breakdown from ML factors
      factorBreakdown = (mlPrediction.factors || []).map((factor, index) => {
        const colors = ['#6366f1', '#22c55e', '#4ade80', '#c084fc', '#f59e0b', '#ef4444'];
        return {
          factor: factor.factor,
          amount: 0, // ML factors are qualitative, not additive
          color: colors[index % colors.length] ?? '#6366f1',
        };
      });
    } else {
      // Adzuna formula for non-ML countries or ML fallback
      const yearsOfExperience = calculateYearsOfExperience(cvExperience, jobTitle);
      const experienceMultiplier = getExperienceMultiplier(yearsOfExperience);
      const educationMultiplier = getEducationMultiplier(cvEducation);
      const skillsPremium = calculateSkillsPremium(cvSkills, effectiveBase, skillRelevanceMap);

      const experienceAmount = Math.round(effectiveBase * experienceMultiplier);
      const educationAmount = Math.round(effectiveBase * educationMultiplier);
      const locationAmount = (nationalMedian > 0 && locationMedian > 0)
        ? Math.round(locationMedian - nationalMedian)
        : 0;

      // Skill gap penalty — only when relevance data is unavailable (weight-1.0 fallback mode)
      // When relevance weights are applied, the reduced skillsPremium already expresses the signal.
      // This penalty acts as a coarse floor when we have no ML relevance to weight with.
      let skillGapPenalty = 0;
      if (cvSkills.length > 0 && !skillRelevanceResult) {
        // No relevance data — can't weight skills, so no penalty either (preserves current behavior)
        skillGapPenalty = 0;
      } else if (cvSkills.length > 0 && skillRelevanceResult) {
        // Relevance data available — penalty only for severe career transitions
        // where relevance weighting alone may not sufficiently reduce the premium
        if (relevantSkillsCount === 0) {
          skillGapPenalty = Math.round(effectiveBase * -0.08);
        } else if (relevantSkillsCount < 2 && overallRelevance < 0.2) {
          skillGapPenalty = Math.round(effectiveBase * -0.04);
        }
      }

      predictedSalary = effectiveBase + experienceAmount + educationAmount + locationAmount + skillsPremium + skillGapPenalty;

      const percentiles = computePercentilesFromHistogram(effectiveHistogram);
      if (percentiles && percentiles.p75 > percentiles.p25) {
        const halfSpread = Math.round((percentiles.p75 - percentiles.p25) / 2);
        salaryMin = Math.round(predictedSalary) - halfSpread;
        salaryMax = Math.round(predictedSalary) + halfSpread;
      } else {
        salaryMin = Math.round(predictedSalary * 0.85);
        salaryMax = Math.round(predictedSalary * 1.15);
      }

      confidence = computeConfidence(effectiveHistogram);
      vsMarketAvg = effectiveBase > 0
        ? Math.round(((predictedSalary - effectiveBase) / effectiveBase) * 100)
        : 0;

      const locationLabel = userLocation1 || 'National';
      factorBreakdown = [
        { factor: 'Base (Market Median)', amount: effectiveBase, color: '#6366f1' },
        { factor: `Location (${locationLabel})`, amount: locationAmount, color: '#22c55e' },
        { factor: `Experience (${yearsOfExperience}yr)`, amount: experienceAmount, color: '#4ade80' },
        { factor: 'Skills Premium', amount: Math.round(skillsPremium), color: '#c084fc' },
        { factor: 'Education', amount: educationAmount, color: '#f59e0b' },
      ];

      if (skillGapPenalty < 0) {
        factorBreakdown.push({ factor: 'Skill Gap', amount: skillGapPenalty, color: '#ef4444' });
      }
    }

    const totalListings = Object.values(effectiveHistogram).reduce((sum, count) => sum + Number(count), 0);

    // Market trend (monthly data from Adzuna history - used for ALL countries)
    const marketTrend: { year: string; salary: number }[] = [];
    for (const [monthKey, salary] of Object.entries(historyData)) {
      marketTrend.push({ year: monthKey, salary: Math.round(Number(salary)) });
    }
    marketTrend.sort((a, b) => a.year.localeCompare(b.year));

    // Skill ROI (using national base for currency-appropriate amounts)
    const skillROI = buildSkillROI(cvSkills, effectiveBase || predictedSalary);

    // Regional comparison
    const regionalComparison = regions.map((region, index) => {
      const histogram = regionalHistograms[index] || {};
      const median = computeMedianFromHistogram(histogram);
      return { location: region.label, salary: median };
    }).filter(r => r.salary > 0);

    // Missing skills
    const missingSkills = buildMissingSkills(
      mlPrediction?.skill_analysis,
      cvSkills,
      dataSource
    );

    // Determine profile match category
    let profileMatch: 'strong' | 'partial' | 'career_transition' | undefined;
    if (skillRelevanceResult) {
      if (overallRelevance >= 0.6 || relevantSkillsCount >= 4) {
        profileMatch = 'strong';
      } else if (overallRelevance >= 0.3 || relevantSkillsCount >= 2) {
        profileMatch = 'partial';
      } else {
        profileMatch = 'career_transition';
      }
    }

    const responseData = {
      success: true,
      data: {
        prediction: {
          jobTitle,
          predictedSalary: Math.round(predictedSalary),
          salaryMin,
          salaryMax,
          confidence,
          vsMarketAvg,
          currency,
          dataSource,
          ...(profileMatch && { profileMatch }),
          ...(skillRelevanceResult && { relevantSkillsCount }),
          ...(skillRelevanceResult && { skillRelevanceScore: overallRelevance }),
        },
        factorBreakdown,
        marketTrend,
        skillROI,
        regionalComparison,
        missingSkills,
        topPayingRoles,
      },
      meta: {
        duration_ms: Date.now() - startTime,
        cvSkillsCount: cvSkills.length,
        yearsOfExperience: calculateYearsOfExperience(cvExperience, jobTitle),
        adzunaListings: totalListings,
        dataSource,
      },
    };

    // Cache for 2 hours
    await cache.set(cacheKey, responseData, 7200);

    console.log(`[Salary] Insights generated in ${Date.now() - startTime}ms (${dataSource}: ${currency}${Math.round(predictedSalary)})`);

    return responseData;
  }

  async savePreferences(userId: string, jobTitle?: string, location?: string) {
    const updateData: Record<string, any> = {};
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
    if (location !== undefined) updateData.location = location;

    if (Object.keys(updateData).length === 0) {
      throw new AppError('No preferences to update', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        ...updateData,
      },
    });

    // Invalidate salary cache for this user
    await cache.delByPattern(`salary:user:${userId}:*`);

    return profile;
  }
}
