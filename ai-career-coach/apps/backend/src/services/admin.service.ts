// apps/backend/src/services/admin.service.ts

import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';
import { prisma, redis, checkDatabaseHealth } from '../config/database.js';
import crypto from 'crypto';
import { AppError, ErrorCodes } from '../utils/app-error.util.js';
import { accountService } from './account.service.js';
import { sendAccountDisabledEmail } from '../utils/email.util.js';

interface ListUsersParams {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface ListJobsParams {
  page: number;
  limit: number;
  source?: string;
  country?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface AuditLogParams {
  page: number;
  limit: number;
  action?: string;
}

export class AdminService {
  //  Dashboard 

  async getDashboardStats() {
    const [totalUsers, totalCVs, totalApplications, totalJobs, disabledUsers, adminCount] =
      await Promise.all([
        prisma.user.count(),
        prisma.cV.count(),
        prisma.application.count(),
        this.getMongoJobCount(),
        prisma.user.count({ where: { isDisabled: true } }),
        prisma.user.count({ where: { role: 'ADMIN' } }),
      ]);

    let serviceHealth;
    try {
      serviceHealth = await checkDatabaseHealth();
    } catch {
      serviceHealth = { postgres: false, mongodb: false, redis: false };
    }

    return {
      totalUsers,
      totalCVs,
      totalApplications,
      totalJobs,
      disabledUsers,
      adminCount,
      serviceHealth,
    };
  }

  async getUserGrowthTrend(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const rows = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE("createdAt")::text AS date, COUNT(*)::bigint AS count
      FROM "User"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY DATE("createdAt") ASC
    `;

    // Build a full zero-filled series then merge query results
    const dailyCounts: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      dailyCounts[date.toISOString().split('T')[0]!] = 0;
    }

    for (const row of rows) {
      if (row.date && dailyCounts[row.date] !== undefined) {
        dailyCounts[row.date] = Number(row.count);
      }
    }

    return Object.entries(dailyCounts).map(([date, count]) => ({ date, count }));
  }

  //  User Management 

  async listUsers(params: ListUsersParams) {
    const { page, limit, search, role, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role === 'disabled') {
      where.isDisabled = true;
    } else if (role) {
      where.role = role;
    }

    const allowedSortFields = ['createdAt', 'email', 'firstName', 'lastName', 'role'];
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isDisabled: true,
          isEmailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          _count: {
            select: {
              cvs: true,
              applications: true,
            },
          },
        },
        orderBy: { [orderByField]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserDetail(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isDisabled: true,
        isEmailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        profile: true,
        cvs: {
          select: {
            id: true,
            filename: true,
            isPrimary: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        applications: {
          select: {
            id: true,
            company: true,
            jobTitle: true,
            status: true,
            atsScore: true,
            appliedDate: true,
          },
          orderBy: { appliedDate: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            cvs: true,
            applications: true,
            savedJobs: true,
            interviewSessions: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);
    }

    return user;
  }

  async toggleUserDisabled(userId: string, disabled: boolean) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);

    await prisma.user.update({
      where: { id: userId },
      data: { isDisabled: disabled },
    });

    // Only notify users whose email is verified; unverified addresses may not
    // belong to the account owner and should not receive admin action emails.
    if (disabled && user.isEmailVerified) {
      void sendAccountDisabledEmail(user.email, user.firstName || '');
    }

    return { message: `User ${disabled ? 'disabled' : 'enabled'} successfully` };
  }

  async promoteUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);
    if (user.role === 'ADMIN') throw new AppError('User is already an admin', 400, ErrorCodes.VALIDATION_ERROR);

    await prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' },
    });

    return { message: 'User promoted to admin' };
  }

  async demoteUser(userId: string, requestingAdminId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);
    if (user.role !== 'ADMIN') throw new AppError('User is not an admin', 400, ErrorCodes.VALIDATION_ERROR);

    if (userId === requestingAdminId) {
      throw new AppError('Cannot demote yourself', 400, ErrorCodes.FORBIDDEN);
    }

    // Ensure at least one admin remains
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      throw new AppError('Cannot demote the last admin', 400, ErrorCodes.FORBIDDEN);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: 'USER' },
    });

    return { message: 'User demoted to regular user' };
  }

  async forcePasswordReset(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);

    const resetToken = crypto.randomBytes(32).toString('hex');

    await prisma.user.update({
      where: { id: userId },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: new Date(Date.now() + 3600000), // 1 hour
      },
    });

    return { resetToken, message: 'Password reset token generated' };
  }

  async deleteUser(userId: string, requestingAdminId: string) {
    if (userId === requestingAdminId) {
      throw new AppError('Cannot delete yourself', 400, ErrorCodes.FORBIDDEN);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);

    return await accountService.deleteUserAccount(userId);
  }

  //  Job Management 

  async listJobs(params: ListJobsParams) {
    const { page, limit, source, country, sortBy, sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const mongoDb = mongoose.connection.db;
    if (!mongoDb) throw new AppError('MongoDB not connected', 503, ErrorCodes.INTERNAL_ERROR);

    const filter: any = {};
    if (source) filter.source = source;
    if (country) filter.country = { $regex: country, $options: 'i' };

    const allowedSortFields = ['title', 'company', 'source', 'country', 'posted_date'];
    const sortField = sortBy && allowedSortFields.includes(sortBy) ? sortBy : 'scraped_at';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const [jobs, total] = await Promise.all([
      mongoDb
        .collection('jobs')
        .find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .toArray(),
      mongoDb.collection('jobs').countDocuments(filter),
    ]);

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getJobStats() {
    const mongoDb = mongoose.connection.db;
    if (!mongoDb) throw new AppError('MongoDB not connected', 503, ErrorCodes.INTERNAL_ERROR);

    const jobsCollection = mongoDb.collection('jobs');

    const [totalJobs, bySource, byCountry] = await Promise.all([
      jobsCollection.countDocuments(),
      jobsCollection
        .aggregate([{ $group: { _id: '$source', count: { $sum: 1 } } }, { $sort: { count: -1 } }])
        .toArray(),
      jobsCollection
        .aggregate([
          {
            $addFields: {
              effectiveCountry: {
                $ifNull: [
                  '$country',
                  {
                    $switch: {
                      branches: [
                        { case: { $regexMatch: { input: { $ifNull: ['$source_url', ''] }, regex: /\.co\.uk\// } }, then: 'gb' },
                        { case: { $regexMatch: { input: { $ifNull: ['$source_url', ''] }, regex: /\.com\.au\// } }, then: 'au' },
                        { case: { $regexMatch: { input: { $ifNull: ['$source_url', ''] }, regex: /\.co\.nz\// } }, then: 'nz' },
                        { case: { $regexMatch: { input: { $ifNull: ['$source_url', ''] }, regex: /\.co\.za\// } }, then: 'za' },
                        { case: { $regexMatch: { input: { $ifNull: ['$source_url', ''] }, regex: /\.ca\// } }, then: 'ca' },
                        { case: { $regexMatch: { input: { $ifNull: ['$source_url', ''] }, regex: /\.de\// } }, then: 'de' },
                        { case: { $regexMatch: { input: { $ifNull: ['$source_url', ''] }, regex: /\.fr\// } }, then: 'fr' },
                        { case: { $regexMatch: { input: { $ifNull: ['$source_url', ''] }, regex: /\.nl\// } }, then: 'nl' },
                        { case: { $regexMatch: { input: { $ifNull: ['$source_url', ''] }, regex: /\.it\// } }, then: 'it' },
                        { case: { $regexMatch: { input: { $ifNull: ['$source_url', ''] }, regex: /\.es\// } }, then: 'es' },
                        { case: { $regexMatch: { input: { $ifNull: ['$source_url', ''] }, regex: /\.pl\// } }, then: 'pl' },
                        { case: { $regexMatch: { input: { $ifNull: ['$source_url', ''] }, regex: /\.com\// } }, then: 'us' },
                      ],
                      default: 'unknown',
                    },
                  },
                ],
              },
            },
          },
          { $group: { _id: '$effectiveCountry', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 20 },
        ])
        .toArray(),
    ]);

    return {
      totalJobs,
      bySource: bySource.map((s) => ({ source: s._id || 'unknown', count: s.count })),
      byCountry: byCountry.map((c) => ({ country: c._id || 'unknown', count: c.count })),
    };
  }

  async triggerJobFetch(country: string, keywords: string, location?: string) {
    const jobApiUrl = process.env.JOB_API_URL || 'http://localhost:8001';
    const response = await fetch(`${jobApiUrl}/api/jobs/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country, keywords, location }),
    });

    if (!response.ok) {
      throw new AppError(`Job fetch failed: ${response.statusText}`, 502, ErrorCodes.ML_SERVICE_ERROR);
    }

    return await response.json();
  }

  async triggerJobCleanup() {
    const jobApiUrl = process.env.JOB_API_URL || 'http://localhost:8001';
    const response = await fetch(`${jobApiUrl}/api/jobs/cleanup`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new AppError(`Job cleanup failed: ${response.statusText}`, 502, ErrorCodes.ML_SERVICE_ERROR);
    }

    return await response.json();
  }

  async deleteJob(jobId: string) {
    const mongoDb = mongoose.connection.db;
    if (!mongoDb) throw new AppError('MongoDB not connected', 503, ErrorCodes.INTERNAL_ERROR);

    const { ObjectId } = mongoose.Types;
    let filter: any;
    try {
      filter = { _id: new ObjectId(jobId) };
    } catch {
      filter = { _id: jobId };
    }

    const result = await mongoDb.collection('jobs').deleteOne(filter);

    if (result.deletedCount === 0) {
      throw new AppError('Job not found', 404, ErrorCodes.NOT_FOUND);
    }

    return { message: 'Job deleted' };
  }

  //  System Monitoring 

  async getServiceHealth() {
    const dbHealth = await checkDatabaseHealth();

    // Check ML Service with response time
    let mlServiceHealthy = false;
    let mlServiceResponseMs: number | null = null;
    try {
      const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
      const startTime = Date.now();
      const response = await fetch(`${mlUrl}/health`, { signal: AbortSignal.timeout(5000) });
      mlServiceResponseMs = Date.now() - startTime;
      mlServiceHealthy = response.ok;
    } catch {
      mlServiceHealthy = false;
    }

    // Check Job API Service with response time
    let jobApiHealthy = false;
    let jobApiResponseMs: number | null = null;
    try {
      const jobApiUrl = process.env.JOB_API_URL || 'http://localhost:8001';
      const startTime = Date.now();
      const response = await fetch(`${jobApiUrl}/health`, { signal: AbortSignal.timeout(5000) });
      jobApiResponseMs = Date.now() - startTime;
      jobApiHealthy = response.ok;
    } catch {
      jobApiHealthy = false;
    }

    return {
      ...dbHealth,
      mlService: mlServiceHealthy,
      mlServiceResponseMs,
      jobApiService: jobApiHealthy,
      jobApiResponseMs,
    };
  }

  async getCacheStats() {
    try {
      const info = await redis.info('stats');
      const memoryInfo = await redis.info('memory');
      const keyCount = await redis.dbsize();

      const parseInfoField = (infoText: string, field: string): string => {
        const match = infoText.match(new RegExp(`${field}:(.+?)\\r?\\n`));
        return match?.[1]?.trim() ?? '0';
      };

      return {
        keyCount,
        hitRate: {
          hits: parseInt(parseInfoField(info, 'keyspace_hits')) || 0,
          misses: parseInt(parseInfoField(info, 'keyspace_misses')) || 0,
        },
        memory: {
          used: parseInfoField(memoryInfo, 'used_memory_human'),
          peak: parseInfoField(memoryInfo, 'used_memory_peak_human'),
        },
      };
    } catch (error) {
      logger.error(error);
      return { keyCount: 0, hitRate: { hits: 0, misses: 0 }, memory: { used: '0B', peak: '0B' } };
    }
  }

  async getQueueStatus() {
    // Bull queues have been removed - all processing is synchronous or handled directly.
    // Return an empty list to keep the admin endpoint functional.
    return [];
  }

  async getDatabaseStats() {
    const [
      usersCount,
      profilesCount,
      cvsCount,
      applicationsCount,
      jobsCount,
      savedJobsCount,
      interviewSessionsCount,
      coursesCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.userProfile.count(),
      prisma.cV.count(),
      prisma.application.count(),
      prisma.job.count(),
      prisma.savedJob.count(),
      prisma.interviewSession.count(),
      prisma.course.count(),
    ]);

    // MongoDB collections
    let mongoCollections: { name: string; count: number }[] = [];
    try {
      const mongoDb = mongoose.connection.db;
      if (mongoDb) {
        const collections = await mongoDb.listCollections().toArray();
        mongoCollections = await Promise.all(
          collections.map(async (col) => ({
            name: col.name,
            count: await mongoDb!.collection(col.name).countDocuments(),
          }))
        );
      }
    } catch (error) {
      logger.error(error);
    }

    return {
      postgres: {
        users: usersCount,
        profiles: profilesCount,
        cvs: cvsCount,
        applications: applicationsCount,
        jobs: jobsCount,
        savedJobs: savedJobsCount,
        interviewSessions: interviewSessionsCount,
        courses: coursesCount,
      },
      mongodb: mongoCollections,
    };
  }

  //  Audit Logs 

  async getAuditLogs(params: AuditLogParams) {
    const { page, limit, action } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        include: {
          admin: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.adminAuditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  //  Helpers 

  private async getMongoJobCount(): Promise<number> {
    try {
      const mongoDb = mongoose.connection.db;
      if (!mongoDb) return 0;
      return await mongoDb.collection('jobs').countDocuments();
    } catch {
      return 0;
    }
  }
}
