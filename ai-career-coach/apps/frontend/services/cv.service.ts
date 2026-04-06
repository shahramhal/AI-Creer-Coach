// apps/frontend/services/cv.service.ts


import api from '../library/api'; 
import type {
  CV,
  CVUploadResponse,
  CVListResponse,
  CVDetailResponse,
  CVUpdateResponse,
  CVUpdatePayload,
  SetPrimaryCVResponse,
  CVOverviewData,
  ATSScoreData,
} from '../types/cv.types';

/**
 * CV Service Class
 * Handles all CV-related API calls using axios
 */
class CVService {
  /**
   * Upload and parse a CV file
   * 
   * How it works:
   * 1. Create FormData with file
   * 2. Send to backend via axios
   * 3. Axios interceptor automatically adds token
   * 4. If token expired, interceptor refreshes and retries
   * 
   * @param file - CV file (PDF or DOCX)
   * @returns Parsed CV data
   */
  async uploadCV(file: File, onProgress?: (percent: number) => void): Promise<CVUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    // axios automatically adds Authorization header via interceptor
    const response = await api.post('/api/v1/ml/parse-cv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data', // Important for file upload
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });

    return response.data;
  }

  /**
   * Get all CVs for the current user
   * 
   * @returns List of user's CVs
   */
  async getUserCVs(): Promise<CVListResponse> {
    // axios interceptor handles:
    // - Adding Authorization header
    // - Refreshing token on 401
    // - Retrying request with new token
    const response = await api.get('/api/v1/ml/cvs');
    return response.data;
  }

  /**
   * Get a single CV by ID
   * 
   * @param cvId - CV identifier
   * @returns CV detail
   */
  async getCVById(cvId: string): Promise<CVDetailResponse> {
    const response = await api.get(`/api/v1/ml/cvs/${cvId}`);
    return response.data;
  }

  /**
   * Update CV parsed data
   * 
   * @param cvId - CV identifier
   * @param payload - Updated data
   * @returns Updated CV
   */
  async updateCV(cvId: string, payload: CVUpdatePayload): Promise<CVUpdateResponse> {
    const response = await api.patch(`/api/v1/ml/cvs/${cvId}`, payload);
    return response.data;
  }

  /**
   * Set a CV as primary (default)
   * 
   * How it works:
   * - Backend sets all user's CVs to isPrimary=false
   * - Then sets this CV to isPrimary=true
   * - Ensures only one primary CV at a time
   * 
   * @param cvId - CV identifier
   * @returns Updated CV
   */
  async setPrimaryCV(cvId: string): Promise<SetPrimaryCVResponse> {
    
    const response = await api.patch(`/api/v1/ml/cvs/${cvId}/primary`);
    return response.data;
  }

  /**
   * Delete a CV
   * 
   * @param cvId - CV identifier
   */
  async deleteCV(cvId: string): Promise<void> {
    await api.delete(`/api/v1/ml/cvs/${cvId}`);
    
    // axios returns response.data, but we don't need it for delete
  }

  /**
   * Download CV file
   * 
   * Important: Use responseType: 'blob' for file downloads
   * This tells axios to return binary data instead of JSON
   * 
   * How it works:
   * 1. Request file from backend (axios adds token automatically)
   * 2. If token expired, axios refreshes and retries
   * 3. Get blob response
   * 4. Create temporary URL
   * 5. Trigger browser download
   * 6. Clean up temporary URL
   * 
   * @param cvId - CV identifier
   * @param filename - Original filename
   */
  async downloadCV(cvId: string, filename: string): Promise<void> {
    // responseType: 'blob' is CRITICAL for file downloads
    // Without it, axios will try to parse as JSON and fail
    const response = await api.get(`/api/v1/ml/cvs/${cvId}/download`, {
      responseType: 'blob', // Tell axios this is binary data
    });

    // Create blob from response
    const blob = response.data;
    
    // Create temporary URL for the blob
    const url = window.URL.createObjectURL(blob);
    
    // Create invisible link element
    const link = document.createElement('a');
    link.href = url;
    link.download = filename; // Set filename for download
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
  /**
   * Analyze a CV for ATS compatibility, keywords, and recommendations
   * Runs locally via ML service (no external API calls)
   */
  async analyzeCV(cvId: string, targetRole?: string): Promise<{ success: boolean; data: CVOverviewData }> {
    const response = await api.post(`/api/v1/ml/cvs/${cvId}/analyze`, {
      targetRole: targetRole || undefined,
    });
    return response.data;
  }

  /**
   * Calculate ATS score for an application (job-specific keyword matching)
   * Persists the result on the Application record
   */
  async calculateATSScore(applicationId: string, cvId?: string): Promise<{ success: boolean; data: ATSScoreData }> {
    const response = await api.post(`/api/v1/applications/${applicationId}/ats-score`, {
      cvId: cvId || undefined,
    });
    return response.data;
  }

  /**
   * Check ATS score with raw job description text
   * No Job or Application record needed
   */
  async checkATSScore(jobDescription: string, cvId?: string): Promise<{ success: boolean; data: ATSScoreData }> {
    const response = await api.post('/api/v1/applications/ats-check', {
      jobDescription,
      cvId: cvId || undefined,
    });
    return response.data;
  }

  /**
   * Preview ATS score for a job without persisting
   * Uses the user's primary CV by default
   */
  async previewATSScore(jobId: string, cvId?: string): Promise<{ success: boolean; data: ATSScoreData }> {
    const response = await api.post(`/api/v1/applications/jobs/${jobId}/ats-preview`, {
      cvId: cvId || undefined,
    });
    return response.data;
  }

  validateFile(file: File): { valid: boolean; error?: string } {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Only PDF and DOCX files are allowed' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 10MB' };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const cvService = new CVService();