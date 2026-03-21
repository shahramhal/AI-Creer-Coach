// apps/frontend/services/admin.service.ts

import api from '../library/api';

class AdminService {
  // Dashboard
  getDashboardStats() {
    return api.get('/api/admin/dashboard/stats');
  }

  getUserGrowthTrend(days: number = 30) {
    return api.get(`/api/admin/dashboard/user-growth?days=${days}`);
  }

  // User Management
  listUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.search) searchParams.set('search', params.search);
    if (params.role) searchParams.set('role', params.role);
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    return api.get(`/api/admin/users?${searchParams.toString()}`);
  }

  getUserDetail(userId: string) {
    return api.get(`/api/admin/users/${userId}`);
  }

  toggleUserStatus(userId: string, disabled: boolean) {
    return api.patch(`/api/admin/users/${userId}/status`, { disabled });
  }

  promoteUser(userId: string) {
    return api.post(`/api/admin/users/${userId}/promote`);
  }

  demoteUser(userId: string) {
    return api.post(`/api/admin/users/${userId}/demote`);
  }

  forceResetPassword(userId: string) {
    return api.post(`/api/admin/users/${userId}/force-reset-password`);
  }

  deleteUser(userId: string) {
    return api.delete(`/api/admin/users/${userId}`);
  }

  // Job Management
  listJobs(params: {
    page?: number;
    limit?: number;
    source?: string;
    country?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.source) searchParams.set('source', params.source);
    if (params.country) searchParams.set('country', params.country);
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    return api.get(`/api/admin/jobs?${searchParams.toString()}`);
  }

  getJobStats() {
    return api.get('/api/admin/jobs/stats');
  }

  triggerJobFetch(data: { keywords: string; country: string; location?: string }) {
    return api.post('/api/admin/jobs/fetch', data);
  }

  triggerJobCleanup() {
    return api.post('/api/admin/jobs/cleanup');
  }

  deleteJob(jobId: string) {
    return api.delete(`/api/admin/jobs/${jobId}`);
  }

  // System
  getServiceHealth() {
    return api.get('/api/admin/system/health');
  }

  getCacheStats() {
    return api.get('/api/admin/system/cache');
  }

  getQueueStatus() {
    return api.get('/api/admin/system/queues');
  }

  getDatabaseStats() {
    return api.get('/api/admin/system/database');
  }

  // Audit Logs
  getAuditLogs(params: { page?: number; limit?: number; action?: string } = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.action) searchParams.set('action', params.action);
    return api.get(`/api/admin/audit-logs?${searchParams.toString()}`);
  }
}

export const adminService = new AdminService();
