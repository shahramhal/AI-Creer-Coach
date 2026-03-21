// apps/frontend/types/salary.types.ts

export interface SalaryInsightsData {
  prediction: SalaryPrediction;
  factorBreakdown: SalaryFactor[];
  marketTrend: MarketTrendPoint[];
  skillROI: SkillROIEntry[];
  regionalComparison: RegionalSalary[];
  missingSkills: MissingSkillEntry[];
  topPayingRoles: TopPayingRole[];
}

export interface SalaryPrediction {
  jobTitle: string;
  predictedSalary: number;
  salaryMin: number;
  salaryMax: number;
  confidence: number;
  vsMarketAvg: number;
  currency: string;
  dataSource: 'ml' | 'adzuna';
  profileMatch?: 'strong' | 'partial' | 'career_transition';
  relevantSkillsCount?: number;
  skillRelevanceScore?: number;
}

export interface SalaryFactor {
  factor: string;
  amount: number;
  color: string;
}

export interface MarketTrendPoint {
  year: string;
  salary: number;
}

export interface SkillROIEntry {
  skill: string;
  avgSalaryIncrease: number;
  learningTime: string;
  demandTrend: number;
  priority: 'High' | 'Medium' | 'Low';
}

export interface RegionalSalary {
  location: string;
  salary: number;
}

export interface MissingSkillEntry {
  skill: string;
  importance: 'High' | 'Medium' | 'Low';
  learnUrl: string;
}

export interface TopPayingRole {
  role: string;
  avgSalary: number;
}

export interface SalaryInsightsResponse {
  success: boolean;
  data: SalaryInsightsData;
  meta?: {
    duration_ms: number;
    cvSkillsCount: number;
    yearsOfExperience: number;
    adzunaListings: number;
    dataSource: 'ml' | 'adzuna';
  };
}
