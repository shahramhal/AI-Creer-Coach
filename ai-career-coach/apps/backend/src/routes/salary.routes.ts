// apps/backend/src/routes/salary.routes.ts

import { Router } from 'express';
import type { Request, Response, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middlewares/auth.middleware.js';
import { prisma, cache } from '../config/database.js';

const router = Router();

const ADZUNA_BASE_URL = 'https://api.adzuna.com/v1/api';
const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || '';
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || '';

// ─── Hardcoded Data Tables ───────────────────────────────────────────────────

const SKILL_PREMIUMS: Record<string, { premium: number; learningTime: string; demandTrend: number }> = {
  'aws': { premium: 18000, learningTime: '40 hours', demandTrend: 45 },
  'kubernetes': { premium: 15000, learningTime: '60 hours', demandTrend: 38 },
  'k8s': { premium: 15000, learningTime: '60 hours', demandTrend: 38 },
  'react': { premium: 8000, learningTime: '30 hours', demandTrend: 25 },
  'react.js': { premium: 8000, learningTime: '30 hours', demandTrend: 25 },
  'reactjs': { premium: 8000, learningTime: '30 hours', demandTrend: 25 },
  'typescript': { premium: 10000, learningTime: '20 hours', demandTrend: 52 },
  'python': { premium: 12000, learningTime: '40 hours', demandTrend: 35 },
  'docker': { premium: 10000, learningTime: '25 hours', demandTrend: 40 },
  'graphql': { premium: 12000, learningTime: '20 hours', demandTrend: 52 },
  'rust': { premium: 20000, learningTime: '100 hours', demandTrend: 28 },
  'system design': { premium: 25000, learningTime: '80 hours', demandTrend: 65 },
  'machine learning': { premium: 22000, learningTime: '120 hours', demandTrend: 55 },
  'ml': { premium: 22000, learningTime: '120 hours', demandTrend: 55 },
  'node.js': { premium: 8000, learningTime: '30 hours', demandTrend: 20 },
  'nodejs': { premium: 8000, learningTime: '30 hours', demandTrend: 20 },
  'node': { premium: 8000, learningTime: '30 hours', demandTrend: 20 },
  'go': { premium: 15000, learningTime: '60 hours', demandTrend: 42 },
  'golang': { premium: 15000, learningTime: '60 hours', demandTrend: 42 },
  'terraform': { premium: 14000, learningTime: '40 hours', demandTrend: 48 },
  'ci/cd': { premium: 8000, learningTime: '20 hours', demandTrend: 30 },
  'cicd': { premium: 8000, learningTime: '20 hours', demandTrend: 30 },
  'sql': { premium: 5000, learningTime: '15 hours', demandTrend: 15 },
  'postgresql': { premium: 6000, learningTime: '20 hours', demandTrend: 18 },
  'mongodb': { premium: 6000, learningTime: '20 hours', demandTrend: 22 },
  'redis': { premium: 7000, learningTime: '15 hours', demandTrend: 25 },
  'java': { premium: 10000, learningTime: '60 hours', demandTrend: 15 },
  'c#': { premium: 10000, learningTime: '60 hours', demandTrend: 12 },
  'azure': { premium: 16000, learningTime: '50 hours', demandTrend: 40 },
  'gcp': { premium: 14000, learningTime: '45 hours', demandTrend: 35 },
  'google cloud': { premium: 14000, learningTime: '45 hours', demandTrend: 35 },
  'next.js': { premium: 10000, learningTime: '25 hours', demandTrend: 48 },
  'nextjs': { premium: 10000, learningTime: '25 hours', demandTrend: 48 },
  'vue': { premium: 7000, learningTime: '25 hours', demandTrend: 18 },
  'vue.js': { premium: 7000, learningTime: '25 hours', demandTrend: 18 },
  'angular': { premium: 8000, learningTime: '40 hours', demandTrend: 10 },
  'kafka': { premium: 15000, learningTime: '50 hours', demandTrend: 35 },
  'elasticsearch': { premium: 12000, learningTime: '40 hours', demandTrend: 25 },
  'microservices': { premium: 12000, learningTime: '60 hours', demandTrend: 30 },
  'devops': { premium: 15000, learningTime: '80 hours', demandTrend: 42 },
  'linux': { premium: 5000, learningTime: '40 hours', demandTrend: 12 },
  'git': { premium: 2000, learningTime: '10 hours', demandTrend: 8 },
  'javascript': { premium: 5000, learningTime: '30 hours', demandTrend: 10 },
  'html': { premium: 2000, learningTime: '10 hours', demandTrend: 5 },
  'css': { premium: 2000, learningTime: '15 hours', demandTrend: 5 },
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
const REGIONAL_LOCATIONS: Record<string, Array<{ label: string; location1: string }>> = {
  gb: [
    { label: 'London', location1: 'London' },
    { label: 'South East', location1: 'South East England' },
    { label: 'North West', location1: 'North West England' },
    { label: 'West Midlands', location1: 'West Midlands' },
    { label: 'Scotland', location1: 'Scotland' },
    { label: 'East of England', location1: 'East of England' },
  ],
  us: [
    { label: 'New York', location1: 'New York' },
    { label: 'California', location1: 'California' },
    { label: 'Texas', location1: 'Texas' },
    { label: 'Washington', location1: 'Washington State' },
    { label: 'Massachusetts', location1: 'Massachusetts' },
  ],
  de: [
    { label: 'Berlin', location1: 'Berlin' },
    { label: 'Bayern', location1: 'Bayern' },
    { label: 'Hamburg', location1: 'Hamburg' },
    { label: 'Hessen', location1: 'Hessen' },
    { label: 'NRW', location1: 'Nordrhein-Westfalen' },
  ],
};

const CURRENCY_MAP: Record<string, string> = {
  gb: '£', us: '$', de: '€', fr: '€', nl: '€', au: 'A$', ca: 'C$',
};

// ─── Adzuna API Helpers ──────────────────────────────────────────────────────

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

// ─── Salary Calculation Helpers ──────────────────────────────────────────────

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

function calculateYearsOfExperience(experience: any[]): number {
  if (!experience || experience.length === 0) return 0;

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
      totalMonths += Math.max(0, (endYear - startYear) * 12);
    }
  }

  return Math.round(totalMonths / 12);
}

function getExperienceMultiplier(years: number): number {
  if (years <= 2) return 0;
  if (years <= 5) return 0.15;
  if (years <= 10) return 0.30;
  if (years <= 15) return 0.40;
  return 0.45;
}

function getEducationMultiplier(education: any[]): number {
  if (!education || education.length === 0) return -0.05;

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

  return -0.05;
}

function calculateSkillsPremium(skills: string[]): number {
  if (!skills || skills.length === 0) return 0;

  let totalPremium = 0;
  const matchedSkills = new Set<string>();

  for (const userSkill of skills) {
    const normalizedSkill = userSkill.toLowerCase().trim();
    const premiumData = SKILL_PREMIUMS[normalizedSkill];
    if (premiumData && !matchedSkills.has(normalizedSkill)) {
      const diminishingFactor = 1 / (1 + matchedSkills.size * 0.3);
      totalPremium += premiumData.premium * diminishingFactor;
      matchedSkills.add(normalizedSkill);
    }
  }

  return Math.min(totalPremium, 25000);
}

function buildSkillROI(skills: string[], currency: string): any[] {
  if (!skills || skills.length === 0) return [];

  const roiEntries: any[] = [];
  const seenSkills = new Set<string>();

  for (const userSkill of skills) {
    const normalizedSkill = userSkill.toLowerCase().trim();
    const premiumData = SKILL_PREMIUMS[normalizedSkill];

    if (premiumData && !seenSkills.has(normalizedSkill)) {
      seenSkills.add(normalizedSkill);

      let priority: 'High' | 'Medium' | 'Low' = 'Low';
      if (premiumData.premium > 12000 || premiumData.demandTrend > 45) {
        priority = 'High';
      } else if (premiumData.premium > 8000 || premiumData.demandTrend > 30) {
        priority = 'Medium';
      }

      roiEntries.push({
        skill: userSkill,
        avgSalaryIncrease: premiumData.premium,
        learningTime: premiumData.learningTime,
        demandTrend: premiumData.demandTrend,
        priority,
      });
    }
  }

  roiEntries.sort((a, b) => b.avgSalaryIncrease - a.avgSalaryIncrease);
  return roiEntries.slice(0, 10);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/salary/insights
 * Returns comprehensive salary insights for the user
 */
router.get(
  '/insights',
  authenticate as RequestHandler,
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      const userId = req.user!.id;
      const jobTitle = (req.query.jobTitle as string) || '';
      const location = (req.query.location as string) || '';
      const country = (req.query.country as string) || 'gb';

      if (!jobTitle) {
        res.status(400).json({
          success: false,
          message: 'Job title is required. Please provide a job title to get salary insights.',
        });
        return;
      }

      if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
        res.status(503).json({
          success: false,
          message: 'Salary service is not configured. Please set ADZUNA_APP_ID and ADZUNA_APP_KEY.',
        });
        return;
      }

      // Check Redis cache
      const cacheKey = `salary:user:${userId}:job:${jobTitle.toLowerCase()}:loc:${location.toLowerCase()}:country:${country}`;
      const cachedResult = await cache.get(cacheKey);
      if (cachedResult) {
        console.log(`[Salary] Cache HIT for user: ${userId}`);
        res.json(cachedResult);
        return;
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

      // Fetch Adzuna data in parallel (using proper location0/location1 hierarchy)
      const [mainHistogram, historyData, ...regionalHistograms] = await Promise.all([
        fetchAdzunaHistogram(country, jobTitle, countryLoc0, userLocation1),
        fetchAdzunaHistory(country, jobTitle, countryLoc0),
        ...regions.map(region => fetchAdzunaHistogram(country, jobTitle, countryLoc0, region.location1)),
      ]);

      // Calculate base salary from histogram
      const baseSalary = computeMedianFromHistogram(mainHistogram);

      if (baseSalary === 0) {
        // Fallback: try country-level only (no location1)
        const fallbackHistogram = await fetchAdzunaHistogram(country, jobTitle, countryLoc0);
        const fallbackBase = computeMedianFromHistogram(fallbackHistogram);

        if (fallbackBase === 0) {
          res.status(404).json({
            success: false,
            message: `No salary data found for "${jobTitle}" in ${country.toUpperCase()}. Try a different job title.`,
          });
          return;
        }

        Object.assign(mainHistogram, fallbackHistogram);
      }

      const effectiveBase = computeMedianFromHistogram(mainHistogram);

      // Calculate factors
      const yearsOfExperience = calculateYearsOfExperience(cvExperience);
      const experienceMultiplier = getExperienceMultiplier(yearsOfExperience);
      const educationMultiplier = getEducationMultiplier(cvEducation);
      const skillsPremium = calculateSkillsPremium(cvSkills);

      const experienceAmount = Math.round(effectiveBase * experienceMultiplier);
      const educationAmount = Math.round(effectiveBase * educationMultiplier);

      // Location factor: difference between location-specific and national median
      const nationalHistogram = await fetchAdzunaHistogram(country, jobTitle, countryLoc0);
      const nationalMedian = computeMedianFromHistogram(nationalHistogram);
      const locationAmount = nationalMedian > 0 ? Math.round(effectiveBase - nationalMedian) : 0;

      const predictedSalary = effectiveBase + experienceAmount + educationAmount + skillsPremium;
      const salaryMin = Math.round(predictedSalary * 0.85);
      const salaryMax = Math.round(predictedSalary * 1.15);

      // Confidence based on histogram data quality
      const totalListings = Object.values(mainHistogram).reduce((sum, count) => sum + Number(count), 0);
      const confidence = Math.min(95, Math.max(40, Math.round(50 + Math.log10(totalListings + 1) * 15)));

      // vs market average
      const marketAvg = nationalMedian || effectiveBase;
      const vsMarketAvg = marketAvg > 0 ? Math.round(((predictedSalary - marketAvg) / marketAvg) * 100) : 0;

      // Factor breakdown
      const locationLabel = userLocation1 || 'National';
      const factorBreakdown = [
        { factor: 'Base', amount: effectiveBase, color: '#6366f1' },
        { factor: `Location (${locationLabel})`, amount: Math.max(0, locationAmount), color: '#22c55e' },
        { factor: `Experience (${yearsOfExperience}yr)`, amount: Math.max(0, experienceAmount), color: '#4ade80' },
        { factor: 'Skills Premium', amount: Math.round(skillsPremium), color: '#c084fc' },
        { factor: 'Education', amount: Math.max(0, educationAmount), color: '#f59e0b' },
      ];

      // Market trend (monthly data from Adzuna history)
      const marketTrend: { year: string; salary: number }[] = [];

      for (const [monthKey, salary] of Object.entries(historyData)) {
        marketTrend.push({ year: monthKey, salary: Math.round(Number(salary)) });
      }

      // Sort chronologically
      marketTrend.sort((a, b) => a.year.localeCompare(b.year));

      // Skill ROI
      const skillROI = buildSkillROI(cvSkills, currency);

      // Regional comparison (using proper Adzuna location hierarchy)
      const regionalComparison = regions.map((region, index) => {
        const histogram = regionalHistograms[index] || {};
        const median = computeMedianFromHistogram(histogram);
        return { location: region.label, salary: median };
      }).filter(r => r.salary > 0);

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
          },
          factorBreakdown,
          marketTrend,
          skillROI,
          regionalComparison,
        },
        meta: {
          duration_ms: Date.now() - startTime,
          cvSkillsCount: cvSkills.length,
          yearsOfExperience,
          adzunaListings: totalListings,
        },
      };

      // Cache for 2 hours
      await cache.set(cacheKey, responseData, 7200);

      console.log(`[Salary] Insights generated in ${Date.now() - startTime}ms (predicted: ${currency}${predictedSalary})`);

      res.json(responseData);

    } catch (error) {
      console.error('[Salary] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate salary insights',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * PATCH /api/salary/preferences
 * Save user's job title and location preferences
 */
router.patch(
  '/preferences',
  authenticate as RequestHandler,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { jobTitle, location } = req.body;

      const updateData: Record<string, any> = {};
      if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
      if (location !== undefined) updateData.location = location;

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({ success: false, message: 'No preferences to update' });
        return;
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

      res.json({
        success: true,
        message: 'Preferences updated',
        data: profile,
      });

    } catch (error) {
      console.error('[Salary] Preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update preferences',
      });
    }
  }
);

export default router;
