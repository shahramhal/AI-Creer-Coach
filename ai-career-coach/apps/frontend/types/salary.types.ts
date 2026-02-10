// apps/frontend/types/salary.types.ts

export interface SalaryInsightsData {
  prediction: SalaryPrediction;
  factorBreakdown: SalaryFactor[];
  marketTrend: MarketTrendPoint[];
  skillROI: SkillROIEntry[];
  regionalComparison: RegionalSalary[];
}

export interface SalaryPrediction {
  jobTitle: string;
  predictedSalary: number;
  salaryMin: number;
  salaryMax: number;
  confidence: number;
  vsMarketAvg: number;
  currency: string;
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

export interface SalaryInsightsResponse {
  success: boolean;
  data: SalaryInsightsData;
  meta?: {
    duration_ms: number;
    cvSkillsCount: number;
    yearsOfExperience: number;
    adzunaListings: number;
  };
}
