export interface CareerPreferences {
  targetRole: string | null;
  experienceLevel: string | null;
  targetCompanies: string[];
  country: string | null;
  region: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  workArrangements: string[];
  jobTitle: string | null;
}
