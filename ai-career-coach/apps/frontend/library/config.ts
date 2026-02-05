// apps/frontend/lib/config.ts

/**
 * Environment configuration
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const config = {
  apiBaseUrl: API_BASE_URL,
  apiTimeout: 30000, // 30 seconds
};
