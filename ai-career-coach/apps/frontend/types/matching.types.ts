export interface MatchBreakdown {
  skill_coverage: number;
  matched_skills: string[];
  missing_skills: string[];
  title_relevance: number;
  summary: string;
}

export interface MatchedJob {
  job_id: string;
  source: string; // 'adzuna' | 'reed' | etc
  title: string;
  company: string;
  location: string;
  description: string;
  salary_min?: number;
  salary_max?: number;
  source_url: string;
  posted_date?: string;
  match_score: number;
  match_breakdown: MatchBreakdown;
  job_type?: string;
  remote_type?: string;
}

export interface JobMatchResponse {
  success: boolean;
  message: string;
  data: {
    matched_jobs: MatchedJob[];
    total_analyzed: number;
    user_cv: {
      name: string;
      uploaded_at: string;
    };
  };
}

export interface MatchFilters {
  country?: string;
  city?: string;
  job_type?: string | string[];
  experience_level?: string;
  title_keywords?: string;
  min_salary?: number;
  remote_type?: string | string[];
}

export type SortOption =
  | 'score_desc'
  | 'score_asc'
  | 'date_desc'
  | 'date_asc'
  | 'salary_desc'
  | 'salary_asc';
