import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';
import { prisma, redis } from '../config/database.js';

export class AccountService {
  async deleteUserAccount(userId: string) {
    // Delete from MongoDB (parsed CVs)
    try {
      const mongoDb = mongoose.connection.db;
      if (mongoDb) {
        await mongoDb.collection('parsed_cvs').deleteMany({ user_id: userId });
      }
    } catch (error) {
      logger.error(error);
    }

    // Delete from Redis cache
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `*${userId}*`, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      logger.error(error);
    }

    // Prisma cascade handles all related Postgres records
    await prisma.user.delete({ where: { id: userId } });

    return { message: 'User and all associated data deleted' };
  }

  async exportUserData(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        cvs: {
          select: {
            filename: true,
            fileUrl: true,
            analysisData: true,
            overviewData: true,
            isPrimary: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        savedJobs: {
          include: {
            job: {
              select: {
                title: true,
                company: true,
                location: true,
                jobType: true,
                sourceUrl: true,
              },
            },
          },
        },
        applications: {
          select: {
            company: true,
            jobTitle: true,
            status: true,
            appliedDate: true,
            notes: true,
            followUpDate: true,
            atsScore: true,
            atsBreakdown: true,
            keywordsMatched: true,
            keywordsMissing: true,
            atsAnalyzedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        interviewSessions: {
          include: {
            answers: {
              select: {
                questionText: true,
                questionCategory: true,
                answerText: true,
                answerDuration: true,
                fillerWordCount: true,
                contentScore: true,
                structureScore: true,
                confidenceScore: true,
                overallScore: true,
                feedback: true,
                createdAt: true,
              },
            },
          },
        },
        learningPaths: {
          include: {
            skill: {
              select: {
                name: true,
                category: true,
              },
            },
          },
        },
        userCourses: {
          include: {
            course: {
              select: {
                title: true,
                platform: true,
                url: true,
                difficulty: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Strip sensitive fields
    const { passwordHash, emailVerifyToken, resetPasswordToken, resetPasswordExpires, id, ...safeUser } = user;

    // Clean up profile
    let cleanProfile = null;
    if (safeUser.profile) {
      const { id: profileId, userId: profileUserId, ...profileData } = safeUser.profile;
      cleanProfile = profileData;
    }

    // Clean up saved jobs
    const cleanSavedJobs = safeUser.savedJobs.map(({ id: savedId, userId: savedUserId, jobId, ...rest }) => rest);

    // Clean up interview sessions
    const cleanInterviewSessions = safeUser.interviewSessions.map(({ id: sessionId, userId: sessionUserId, ...session }) => ({
      ...session,
      answers: session.answers,
    }));

    // Clean up learning paths
    const cleanLearningPaths = safeUser.learningPaths.map(({ id: pathId, userId: pathUserId, skillId, ...path }) => path);

    // Clean up user courses
    const cleanUserCourses = safeUser.userCourses.map(({ id: courseId, userId: courseUserId, courseId: cId, ...uc }) => uc);

    return {
      email: safeUser.email,
      firstName: safeUser.firstName,
      lastName: safeUser.lastName,
      role: safeUser.role,
      isEmailVerified: safeUser.isEmailVerified,
      lastLoginAt: safeUser.lastLoginAt,
      createdAt: safeUser.createdAt,
      updatedAt: safeUser.updatedAt,
      profile: cleanProfile,
      cvs: safeUser.cvs,
      savedJobs: cleanSavedJobs,
      applications: safeUser.applications,
      interviewSessions: cleanInterviewSessions,
      learningPaths: cleanLearningPaths,
      userCourses: cleanUserCourses,
    };
  }
}

export const accountService = new AccountService();
