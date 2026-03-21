// apps/frontend/types/profile.ts

export interface Profile {
  id: string;
  userId: string;
  phoneNumber?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  jobTitle?: string | null;
  targetRole?: string | null;
  experienceLevel?: string | null;
  targetCompanies?: string[] | null;
  country?: string | null;
  region?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  workArrangements?: string[] | null;
  createdAt: string;
  updatedAt: string;
}
