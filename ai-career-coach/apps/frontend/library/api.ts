import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from './auth';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important: Send cookies with requests
  timeout: 60000, // Default 60 second timeout
});

// Request interceptor - Add auth token from in-memory store
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Deduplicate concurrent refresh requests so only one hits the backend
let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const skipRefreshEndpoints = ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/refresh'];
    const shouldSkipRefresh = skipRefreshEndpoints.some((endpoint) =>
      originalRequest.url?.includes(endpoint)
    );

    if (error.response?.status === 401 && !originalRequest._retry && !shouldSkipRefresh) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(
              `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,
              {},
              { withCredentials: true },
            )
            .then((res) => res.data.data.accessToken as string)
            .finally(() => {
              refreshPromise = null;
            });
        }

        const newToken = await refreshPromise;
        setAccessToken(newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearAccessToken();
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  register: (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => api.post('/api/v1/auth/register', data),

  login: (email: string, password: string) =>
    api.post('/api/v1/auth/login', { email, password }),

  logout: () => api.post('/api/v1/auth/logout'),

  verifyEmail: (token: string) =>
    api.get(`/api/v1/auth/verify-email?token=${token}`),

  forgotPassword: (email: string) =>
    api.post('/api/v1/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/api/v1/auth/reset-password', { token, password }),

  getCurrentUser: () => api.get('/api/v1/auth/me'),

  refreshToken: () => api.post('/api/v1/auth/refresh'),
};

export default api;