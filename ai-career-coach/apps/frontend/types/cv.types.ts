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
 * CV analysis data
 * Future feature: ATS compatibility, recommendations
 */
export interface AnalysisData {
  atsScore?: number;
  recommendations?: string[];
  keywordMatches?: string[];
  missingKeywords?: string[];
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