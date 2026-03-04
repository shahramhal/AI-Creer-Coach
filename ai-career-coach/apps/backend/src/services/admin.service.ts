// apps/backend/src/services/admin.service.ts

import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';
import { redis, queues, checkDatabaseHealth } from '../config/database.js';
import crypto from 'crypto';
import { AppError, ErrorCodes } from '../utils/app-error.util.js';

const prisma = new PrismaClient();

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
}

interface AuditLogParams {
  page: number;
  limit: number;
  action?: string;
}

export class AdminService {
  // ─── Dashboard ──────────────────────────────────────────────

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

    const users = await prisma.user.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day
    const dailyCounts: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      dailyCounts[date.toISOString().split('T')[0]] = 0;
    }

    for (const user of users) {
      const dateKey = user.createdAt.toISOString().split('T')[0];
      if (dailyCounts[dateKey] !== undefined) {
        dailyCounts[dateKey]++;
      }
    }

    return Object.entries(dailyCounts).map(([date, count]) => ({ date, count }));
  }

  // ─── User Management ───────────────────────────────────────

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

    // Delete from MongoDB (parsed CVs)
    try {
      const mongoDb = mongoose.connection.db;
      if (mongoDb) {
        await mongoDb.collection('parsed_cvs').deleteMany({ userId });
      }
    } catch (error) {
      console.error('Failed to delete MongoDB data for user:', error);
    }

    // Delete from Redis cache
    try {
      const cacheKeys = await redis.keys(`*${userId}*`);
      if (cacheKeys.length > 0) {
        await redis.del(...cacheKeys);
      }
    } catch (error) {
      console.error('Failed to clear Redis cache for user:', error);
    }

    // Prisma cascade handles all related Postgres records
    await prisma.user.delete({ where: { id: userId } });

    return { message: 'User and all associated data deleted' };
  }

  // ─── Job Management ────────────────────────────────────────

  async listJobs(params: ListJobsParams) {
    const { page, limit, source, country } = params;
    const skip = (page - 1) * limit;

    const mongoDb = mongoose.connection.db;
    if (!mongoDb) throw new AppError('MongoDB not connected', 503, ErrorCodes.INTERNAL_ERROR);

    const filter: any = {};
    if (source) filter.source = source;
    if (country) filter.country = { $regex: country, $options: 'i' };

    const [jobs, total] = await Promise.all([
      mongoDb
        .collection('jobs')
        .find(filter)
        .sort({ created_at: -1 })
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
          { $group: { _id: '$country', count: { $sum: 1 } } },
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

  // ─── System Monitoring ─────────────────────────────────────

  async getServiceHealth() {
    const dbHealth = await checkDatabaseHealth();

    // Check ML Service
    let mlServiceHealthy = false;
    try {
      const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
      const response = await fetch(`${mlUrl}/health`, { signal: AbortSignal.timeout(5000) });
      mlServiceHealthy = response.ok;
    } catch {
      mlServiceHealthy = false;
    }

    // Check Job API Service
    let jobApiHealthy = false;
    try {
      const jobApiUrl = process.env.JOB_API_URL || 'http://localhost:8001';
      const response = await fetch(`${jobApiUrl}/health`, { signal: AbortSignal.timeout(5000) });
      jobApiHealthy = response.ok;
    } catch {
      jobApiHealthy = false;
    }

    return {
      ...dbHealth,
      mlService: mlServiceHealthy,
      jobApiService: jobApiHealthy,
    };
  }

  async getCacheStats() {
    try {
      const info = await redis.info('stats');
      const memoryInfo = await redis.info('memory');
      const keyCount = await redis.dbsize();

      const parseInfoField = (infoText: string, field: string): string => {
        const match = infoText.match(new RegExp(`${field}:(.+?)\\r?\\n`));
        return match ? match[1].trim() : '0';
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
      console.error('Failed to get cache stats:', error);
      return { keyCount: 0, hitRate: { hits: 0, misses: 0 }, memory: { used: '0B', peak: '0B' } };
    }
  }

  async getQueueStatus() {
    const queueStats = [];

    for (const [name, queue] of Object.entries(queues)) {
      try {
        const [waiting, active, completed, failed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
        ]);
        queueStats.push({ name, waiting, active, completed, failed });
      } catch {
        queueStats.push({ name, waiting: 0, active: 0, completed: 0, failed: 0, error: true });
      }
    }

    return queueStats;
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
      console.error('Failed to get MongoDB stats:', error);
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

  // ─── Audit Logs ────────────────────────────────────────────

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

  // ─── Helpers ───────────────────────────────────────────────

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
