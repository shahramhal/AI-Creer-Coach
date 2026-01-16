

import { API_BASE_URL } from '../lib/config';
import type {
  CV,
  CVUploadResponse,
  CVListResponse,
  CVDetailResponse,
  CVUpdateResponse,
  CVUpdatePayload,
  SetPrimaryCVResponse,
} from '../types/cv.types';

/**
 * CV Service
 * Handles all CV-related API calls
 */
class CVService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/ml`;
  }

  /**
   * Get authorization header with JWT token
   */
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken');
    return {
      'Authorization': `Bearer ${token}`,
    };
  }

  /**
   * Upload and parse a CV file
   * @param file - CV file (PDF or DOCX)
   * @returns Parsed CV data
   */
  async uploadCV(file: File): Promise<CVUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/parse-cv`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload CV');
    }

    return response.json();
  }

  /**
   * Get all CVs for the current user
   * @returns List of user's CVs
   */
  async getUserCVs(): Promise<CVListResponse> {
    const response = await fetch(`${this.baseUrl}/cvs`, {
      method: 'GET',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch CVs');
    }

    return response.json();
  }

  /**
   * Get a single CV by ID
   * @param cvId - CV identifier
   * @returns CV detail
   */
  async getCVById(cvId: string): Promise<CVDetailResponse> {
    const response = await fetch(`${this.baseUrl}/cvs/${cvId}`, {
      method: 'GET',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch CV');
    }

    return response.json();
  }

  /**
   * Update CV parsed data
   * @param cvId - CV identifier
   * @param payload - Updated data
   * @returns Updated CV
   */
  async updateCV(cvId: string, payload: CVUpdatePayload): Promise<CVUpdateResponse> {
    const response = await fetch(`${this.baseUrl}/cvs/${cvId}`, {
      method: 'PATCH',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update CV');
    }

    return response.json();
  }

  /**
   * Set a CV as primary (default)
   * @param cvId - CV identifier
   * @returns Updated CV
   */
  async setPrimaryCV(cvId: string): Promise<SetPrimaryCVResponse> {
    const response = await fetch(`${this.baseUrl}/cvs/${cvId}/set-primary`, {
      method: 'PATCH',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to set primary CV');
    }

    return response.json();
  }

  /**
   * Delete a CV
   * @param cvId - CV identifier
   */
  async deleteCV(cvId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/cvs/${cvId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete CV');
    }
  }

  /**
   * Download CV file
   * @param cvId - CV identifier
   * @param filename - Original filename
   */
  async downloadCV(cvId: string, filename: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/cvs/${cvId}/download`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to download CV');
    }

    // Create blob and trigger download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const cvService = new CVService();