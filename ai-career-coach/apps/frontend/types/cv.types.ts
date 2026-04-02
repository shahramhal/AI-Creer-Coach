// apps/frontend/types/cv.types.ts

/**
 * CV database record structure
 * Maps to Prisma CV model
 */
export interface CV {
  id: string;
  userId: string;
  filename: string;
  fileUrl: string;
  parsedData: ParsedCVData | null;
  analysisData: AnalysisData | null;
  overviewData: CVOverviewData | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Parsed CV data structure
 * Returned from ML service after CV parsing
 */
export interface ParsedCVData {
  // Personal information
  personal: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };

  // Professional summary
  summary?: string;

  // Work experience
  experience: Experience[];

  // Education history
  education: Education[];

  // Technical and soft skills
  skills: string[];

  // Certifications
  certifications?: Certification[];

  // Languages
  languages?: Language[];

  // Projects (if available)
  projects?: Project[];
}

/**
 * Work experience entry
 */
export interface Experience {
  id?: string;
  company: string;
  title: string;
  location?: string;
  startDate: string;  // Format: "YYYY-MM" or "YYYY"
  endDate?: string;   // "YYYY-MM", "YYYY", or "Present"
  current?: boolean;
  duration?: string;  // e.g., "2 years 3 months"
  responsibilities: string[];
  achievements?: string[];
}

/**
 * Education entry
 */
export interface Education {
  id?: string;
  institution: string;
  degree: string;
  field?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
  achievements?: string[];
}

/**
 * Certification entry
 */
export interface Certification {
  id?: string;
  name: string;
  issuer: string;
  date?: string;
  expiryDate?: string;
  credentialId?: string;
  url?: string;
}

/**
 * Language proficiency
 */
export interface Language {
  name: string;
  proficiency: 'Native' | 'Fluent' | 'Professional' | 'Intermediate' | 'Basic';
}

/**
 * Project entry
 */
export interface Project {
  id?: string;
  name: string;
  description: string;
  technologies?: string[];
  url?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * CV analysis data - comprehensive analysis result
 */
export interface AnalysisData {
  overallScore: number;
  scoreBreakdown: {
    contentQuality: number;
    atsCompatibility: number;
    keywordsMatch: number;
    formatStructure: number;
    experienceClarity: number;
  };
  priorityIssues: PriorityIssue[];
  atsAnalysis: ATSCheck[];
  missingKeywords: MissingKeyword[];
  recommendations: Recommendation[];
  analyzedAt: string;
}

export interface PriorityIssue {
  severity: 'critical' | 'warning' | 'suggestion';
  title: string;
  description: string;
  impact: string;
}

export interface ATSCheck {
  status: 'pass' | 'warning' | 'fail';
  title: string;
  description: string;
}

export interface MissingKeyword {
  keyword: string;
  jobFrequency: string;
  section: string;
  impact: string;
}

export interface Recommendation {
  priority: number;
  title: string;
  description: string;
  impact: 'High Impact' | 'Medium Impact' | 'Low Impact';
  timeEstimate: string;
  impactRate: string;
}

/**
 * CV Overview Data - Job-agnostic quality assessment (4 categories)
 */
export interface CVOverviewData {
  overallScore: number;
  scoreBreakdown: {
    contentQuality: number;
    formatStructure: number;
    experienceClarity: number;
    atsReadability: number;
  };
  atsChecks: ATSCheck[];
  priorityIssues: PriorityIssue[];
  recommendations: Recommendation[];
  metadata: {
    wordCount: number;
    sectionCount: number;
  };
  analyzedAt: string;
}

/**
 * ATS Score Data - Job-specific keyword matching result
 */
export interface ATSScoreData {
  atsScore: number;
  breakdown: {
    keywordMatch: number;
    semanticSimilarity: number;
    skillsCoverage: number;
  };
  keywordsMatched: { keyword: string; foundIn: string }[];
  keywordsMissing: { keyword: string; importance: 'high' | 'medium' | 'low'; suggestion: string }[];
  matchDetails: {
    totalJobKeywords: number;
    matchedCount: number;
    semanticScore: number;
  };
  suggestions: string[];
}

/**
 * API response for CV upload
 */
export interface CVUploadResponse {
  success: boolean;
  message: string;
  data: {
    cvId: string;
    filename: string;
    parsedData: ParsedCVData;
    createdAt: string;
  };
}

/**
 * API response for CV list
 */
export interface CVListResponse {
  success: boolean;
  data: CV[];
}

/**
 * API response for single CV
 */
export interface CVDetailResponse {
  success: boolean;
  data: CV;
}

/**
 * API response for CV update
 */
export interface CVUpdateResponse {
  success: boolean;
  message: string;
  data: CV;
}

/**
 * API response for setting primary CV
 */
export interface SetPrimaryCVResponse {
  success: boolean;
  message: string;
  data: CV;
}

/**
 * CV upload form data
 */
export interface CVUploadFormData {
  file: File;
}

/**
 * CV update payload
 */
export interface CVUpdatePayload {
  parsedData?: Partial<ParsedCVData>;
  isPrimary?: boolean;
}