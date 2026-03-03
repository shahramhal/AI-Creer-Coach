// apps/frontend/types/admin.types.ts

export interface AdminDashboardStats {
  totalUsers: number;
  totalCVs: number;
  totalApplications: number;
  totalJobs: number;
  disabledUsers: number;
  adminCount: number;
  serviceHealth: ServiceHealthStatus;
}

export interface ServiceHealthStatus {
  postgres: boolean;
  mongodb: boolean;
  redis: boolean;
  mlService: boolean;
  jobApiService: boolean;
  timestamp?: string;
}

export interface UserGrowthPoint {
  date: string;
  count: number;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'USER' | 'ADMIN';
  isDisabled: boolean;
  isEmailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  _count: {
    cvs: number;
    applications: number;
  };
}

export interface UserListResponse {
  users: AdminUser[];
  pagination: PaginationInfo;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'USER' | 'ADMIN';
  isDisabled: boolean;
  isEmailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  profile: {
    phoneNumber: string | null;
    location: string | null;
    linkedinUrl: string | null;
    githubUrl: string | null;
    portfolioUrl: string | null;
    bio: string | null;
    avatarUrl: string | null;
    jobTitle: string | null;
  } | null;
  cvs: {
    id: string;
    filename: string;
    isPrimary: boolean;
    createdAt: string;
  }[];
  applications: {
    id: string;
    company: string;
    jobTitle: string;
    status: string;
    atsScore: number | null;
    appliedDate: string;
  }[];
  _count: {
    cvs: number;
    applications: number;
    savedJobs: number;
    interviewSessions: number;
  };
}

export interface QueueStatus {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  error?: boolean;
}

export interface CacheStats {
  keyCount: number;
  hitRate: {
    hits: number;
    misses: number;
  };
  memory: {
    used: string;
    peak: string;
  };
}

export interface DatabaseStats {
  postgres: Record<string, number>;
  mongodb: { name: string; count: number }[];
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  admin: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export interface AuditLogResponse {
  logs: AuditLogEntry[];
  pagination: PaginationInfo;
}

export interface AdminJobListItem {
  _id: string;
  title?: string;
  company?: string;
  location?: string;
  source?: string;
  country?: string;
  job_type?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface JobStats {
  totalJobs: number;
  bySource: { source: string; count: number }[];
  byCountry: { country: string; count: number }[];
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
