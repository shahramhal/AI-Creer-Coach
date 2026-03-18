import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DashboardActivity {
  id: string;
  type: 'cv_upload' | 'cv_update' | 'application' | 'job_saved' | 'learning_started' | 'learning_completed';
  title: string;
  description: string;
  timestamp: string;
}

export class DashboardService {
  async getRecentActivity(userId: string, limit: number = 10): Promise<DashboardActivity[]> {
    const [cvs, applications, savedJobs, learningPaths] = await Promise.all([
      prisma.cV.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        select: {
          id: true,
          filename: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.application.findMany({
        where: { userId },
        orderBy: { appliedDate: 'desc' },
        take: limit,
        select: {
          id: true,
          jobTitle: true,
          company: true,
          appliedDate: true,
        },
      }),
      prisma.savedJob.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          job: {
            select: {
              title: true,
              company: true,
            },
          },
        },
      }),
      prisma.learningPath.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          skill: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    const activities: DashboardActivity[] = [];

    for (const cv of cvs) {
      const isUpload = cv.createdAt.getTime() === cv.updatedAt.getTime();
      activities.push({
        id: cv.id,
        type: isUpload ? 'cv_upload' : 'cv_update',
        title: isUpload ? 'CV Uploaded' : 'CV Updated',
        description: cv.filename,
        timestamp: (isUpload ? cv.createdAt : cv.updatedAt).toISOString(),
      });
    }

    for (const application of applications) {
      activities.push({
        id: application.id,
        type: 'application',
        title: 'Application Submitted',
        description: `${application.jobTitle} at ${application.company}`,
        timestamp: application.appliedDate.toISOString(),
      });
    }

    for (const savedJob of savedJobs) {
      activities.push({
        id: savedJob.id,
        type: 'job_saved',
        title: 'Job Saved',
        description: `${savedJob.job.title} at ${savedJob.job.company}`,
        timestamp: savedJob.createdAt.toISOString(),
      });
    }

    for (const learningPath of learningPaths) {
      const isCompleted = learningPath.status === 'completed';
      activities.push({
        id: learningPath.id,
        type: isCompleted ? 'learning_completed' : 'learning_started',
        title: isCompleted ? 'Learning Completed' : 'Learning Started',
        description: learningPath.skill.name,
        timestamp: (isCompleted && learningPath.completedAt
          ? learningPath.completedAt
          : learningPath.createdAt
        ).toISOString(),
      });
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return activities.slice(0, limit);
  }
}
