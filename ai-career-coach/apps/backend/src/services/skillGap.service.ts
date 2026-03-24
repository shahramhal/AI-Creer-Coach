import { PrismaClient } from '@prisma/client';
import { cache } from '../config/database.js';

const prisma = new PrismaClient();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8000';

// Static course recommendations keyed by skill name
const COURSE_CATALOG: Record<string, Array<{
  title: string;
  platform: string;
  url: string;
  price: number;
  duration: number;
  rating: number;
  difficulty: string;
}>> = {
  python: [
    { title: 'Python for Everybody', platform: 'Coursera', url: 'https://www.coursera.org/specializations/python', price: 0, duration: 40, rating: 4.8, difficulty: 'beginner' },
    { title: 'Complete Python Bootcamp', platform: 'Udemy', url: 'https://www.udemy.com/course/complete-python-bootcamp/', price: 14.99, duration: 22, rating: 4.6, difficulty: 'beginner' },
    { title: 'Introduction to Computer Science and Programming Using Python', platform: 'MIT OCW', url: 'https://ocw.mit.edu/courses/6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016/', price: 0, duration: 50, rating: 4.9, difficulty: 'beginner' },
  ],
  javascript: [
    { title: 'The Complete JavaScript Course', platform: 'Udemy', url: 'https://www.udemy.com/course/the-complete-javascript-course/', price: 14.99, duration: 69, rating: 4.7, difficulty: 'beginner' },
    { title: 'JavaScript Algorithms and Data Structures', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/', price: 0, duration: 300, rating: 4.8, difficulty: 'beginner' },
  ],
  typescript: [
    { title: 'Understanding TypeScript', platform: 'Udemy', url: 'https://www.udemy.com/course/understanding-typescript/', price: 14.99, duration: 15, rating: 4.6, difficulty: 'intermediate' },
    { title: 'TypeScript for JavaScript Programmers', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/news/learn-typescript-beginners-guide/', price: 0, duration: 10, rating: 4.5, difficulty: 'beginner' },
  ],
  react: [
    { title: 'Full Stack Open - React', platform: 'University of Helsinki', url: 'https://fullstackopen.com/en/', price: 0, duration: 40, rating: 4.8, difficulty: 'intermediate' },
    { title: 'React Front To Back', platform: 'Udemy', url: 'https://www.udemy.com/course/react-front-to-back-2022/', price: 14.99, duration: 20, rating: 4.7, difficulty: 'intermediate' },
    { title: 'React Tutorial for Beginners', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/front-end-development-libraries/#react', price: 0, duration: 15, rating: 4.6, difficulty: 'beginner' },
  ],
  node: [
    { title: 'The Complete Node.js Developer Course', platform: 'Udemy', url: 'https://www.udemy.com/course/the-complete-nodejs-developer-course-2/', price: 14.99, duration: 35, rating: 4.6, difficulty: 'intermediate' },
    { title: 'Node.js and Express.js Full Course', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/back-end-development-and-apis/', price: 0, duration: 20, rating: 4.6, difficulty: 'beginner' },
  ],
  nodejs: [
    { title: 'The Complete Node.js Developer Course', platform: 'Udemy', url: 'https://www.udemy.com/course/the-complete-nodejs-developer-course-2/', price: 14.99, duration: 35, rating: 4.6, difficulty: 'intermediate' },
    { title: 'Node.js and Express.js Full Course', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/back-end-development-and-apis/', price: 0, duration: 20, rating: 4.6, difficulty: 'beginner' },
  ],
  docker: [
    { title: 'Docker & Kubernetes: The Practical Guide', platform: 'Udemy', url: 'https://www.udemy.com/course/docker-kubernetes-the-practical-guide/', price: 14.99, duration: 24, rating: 4.7, difficulty: 'intermediate' },
    { title: 'Docker Essentials: A Developer Introduction', platform: 'Coursera', url: 'https://www.coursera.org/learn/docker-container-essentials-web-app', price: 0, duration: 10, rating: 4.5, difficulty: 'beginner' },
  ],
  kubernetes: [
    { title: 'Kubernetes for the Absolute Beginners', platform: 'Udemy', url: 'https://www.udemy.com/course/learn-kubernetes/', price: 14.99, duration: 6, rating: 4.6, difficulty: 'beginner' },
    { title: 'Introduction to Kubernetes', platform: 'Coursera', url: 'https://www.coursera.org/learn/introduction-to-kubernetes', price: 0, duration: 12, rating: 4.5, difficulty: 'beginner' },
  ],
  aws: [
    { title: 'AWS Certified Solutions Architect', platform: 'Udemy', url: 'https://www.udemy.com/course/aws-certified-solutions-architect-associate/', price: 14.99, duration: 27, rating: 4.7, difficulty: 'intermediate' },
    { title: 'AWS Cloud Practitioner Essentials', platform: 'Coursera', url: 'https://www.coursera.org/learn/aws-cloud-practitioner-essentials', price: 0, duration: 18, rating: 4.7, difficulty: 'beginner' },
  ],
  sql: [
    { title: 'The Complete SQL Bootcamp', platform: 'Udemy', url: 'https://www.udemy.com/course/the-complete-sql-bootcamp/', price: 14.99, duration: 9, rating: 4.7, difficulty: 'beginner' },
    { title: 'SQL for Data Science', platform: 'Coursera', url: 'https://www.coursera.org/learn/sql-for-data-science', price: 0, duration: 15, rating: 4.6, difficulty: 'beginner' },
  ],
  'machine learning': [
    { title: 'Machine Learning by Andrew Ng', platform: 'Coursera', url: 'https://www.coursera.org/learn/machine-learning', price: 0, duration: 60, rating: 4.9, difficulty: 'intermediate' },
  ],
  'data science': [
    { title: 'IBM Data Science Professional Certificate', platform: 'Coursera', url: 'https://www.coursera.org/professional-certificates/ibm-data-science', price: 0, duration: 80, rating: 4.6, difficulty: 'beginner' },
  ],
  terraform: [
    { title: 'HashiCorp Certified: Terraform Associate', platform: 'Udemy', url: 'https://www.udemy.com/course/terraform-beginner-to-advanced/', price: 14.99, duration: 18, rating: 4.6, difficulty: 'intermediate' },
    { title: 'Introduction to Terraform', platform: 'Coursera', url: 'https://www.coursera.org/learn/terraform-cloud', price: 0, duration: 10, rating: 4.4, difficulty: 'beginner' },
  ],
  'ci/cd': [
    { title: 'CI/CD with GitHub Actions', platform: 'Udemy', url: 'https://www.udemy.com/course/github-actions/', price: 14.99, duration: 10, rating: 4.5, difficulty: 'intermediate' },
    { title: 'Introduction to CI/CD', platform: 'Coursera', url: 'https://www.coursera.org/learn/continuous-integration', price: 0, duration: 8, rating: 4.4, difficulty: 'beginner' },
  ],
  git: [
    { title: 'Git Complete: The Definitive Guide', platform: 'Udemy', url: 'https://www.udemy.com/course/git-complete/', price: 14.99, duration: 6, rating: 4.5, difficulty: 'beginner' },
    { title: 'Introduction to Git and GitHub', platform: 'Coursera', url: 'https://www.coursera.org/learn/introduction-git-github', price: 0, duration: 16, rating: 4.6, difficulty: 'beginner' },
  ],
  agile: [
    { title: 'Agile Fundamentals: Scrum & Kanban', platform: 'Udemy', url: 'https://www.udemy.com/course/agile-fundamentals/', price: 14.99, duration: 3, rating: 4.5, difficulty: 'beginner' },
    { title: 'Agile with Atlassian Jira', platform: 'Coursera', url: 'https://www.coursera.org/learn/agile-atlassian-jira', price: 0, duration: 8, rating: 4.6, difficulty: 'beginner' },
  ],
  'rest api': [
    { title: 'REST APIs with Flask and Python', platform: 'Udemy', url: 'https://www.udemy.com/course/rest-api-flask-and-python/', price: 14.99, duration: 17, rating: 4.6, difficulty: 'intermediate' },
    { title: 'RESTful Web Services - Basics', platform: 'Coursera', url: 'https://www.coursera.org/learn/restful-web-services', price: 0, duration: 10, rating: 4.5, difficulty: 'beginner' },
  ],
  'api design': [
    { title: 'API Design and Fundamentals of Google Cloud', platform: 'Coursera', url: 'https://www.coursera.org/learn/api-design-apigee-gcp', price: 0, duration: 10, rating: 4.5, difficulty: 'intermediate' },
    { title: 'REST API Design, Development & Management', platform: 'Udemy', url: 'https://www.udemy.com/course/rest-api/', price: 14.99, duration: 8, rating: 4.4, difficulty: 'intermediate' },
  ],
  microservices: [
    { title: 'Microservices with Node.js and React', platform: 'Udemy', url: 'https://www.udemy.com/course/microservices-with-node-js-and-react/', price: 14.99, duration: 54, rating: 4.7, difficulty: 'advanced' },
    { title: 'Introduction to Microservices', platform: 'Coursera', url: 'https://www.coursera.org/learn/intro-to-microservices', price: 0, duration: 12, rating: 4.5, difficulty: 'beginner' },
  ],
  graphql: [
    { title: 'The Modern GraphQL Bootcamp', platform: 'Udemy', url: 'https://www.udemy.com/course/graphql-bootcamp/', price: 14.99, duration: 23, rating: 4.6, difficulty: 'intermediate' },
    { title: 'Introduction to GraphQL', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/news/graphql-for-beginners/', price: 0, duration: 8, rating: 4.5, difficulty: 'beginner' },
  ],
  redis: [
    { title: 'Redis: The Complete Developer Guide', platform: 'Udemy', url: 'https://www.udemy.com/course/redis-the-complete-developers-guide-p/', price: 14.99, duration: 22, rating: 4.7, difficulty: 'intermediate' },
    { title: 'Redis University - Introduction to Redis', platform: 'Redis University', url: 'https://university.redis.io/', price: 0, duration: 10, rating: 4.6, difficulty: 'beginner' },
  ],
  testing: [
    { title: 'Testing JavaScript with Jest', platform: 'Udemy', url: 'https://www.udemy.com/course/jest-testing/', price: 14.99, duration: 12, rating: 4.5, difficulty: 'intermediate' },
    { title: 'Software Testing Fundamentals', platform: 'Coursera', url: 'https://www.coursera.org/learn/software-testing-fundamentals', price: 0, duration: 15, rating: 4.5, difficulty: 'beginner' },
  ],
  linux: [
    { title: 'Linux Mastery: Master the Linux Command Line', platform: 'Udemy', url: 'https://www.udemy.com/course/linux-mastery/', price: 14.99, duration: 11, rating: 4.7, difficulty: 'beginner' },
    { title: 'Introduction to Linux', platform: 'Coursera', url: 'https://www.coursera.org/learn/linux-fundamentals', price: 0, duration: 20, rating: 4.7, difficulty: 'beginner' },
  ],
  mongodb: [
    { title: 'MongoDB - The Complete Developer Guide', platform: 'Udemy', url: 'https://www.udemy.com/course/mongodb-the-complete-developers-guide/', price: 14.99, duration: 17, rating: 4.7, difficulty: 'intermediate' },
    { title: 'MongoDB University - M001 Basics', platform: 'MongoDB University', url: 'https://learn.mongodb.com/learning-paths/introduction-to-mongodb', price: 0, duration: 12, rating: 4.7, difficulty: 'beginner' },
  ],
  express: [
    { title: 'Just Express (with a bunch of Node and HTTP)', platform: 'Udemy', url: 'https://www.udemy.com/course/just-express-with-a-bunch-of-node-and-http-in-detail/', price: 14.99, duration: 12, rating: 4.6, difficulty: 'intermediate' },
    { title: 'Backend Development and APIs', platform: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/back-end-development-and-apis/', price: 0, duration: 15, rating: 4.6, difficulty: 'beginner' },
  ],
  'next.js': [
    { title: 'Next.js & React - The Complete Guide', platform: 'Udemy', url: 'https://www.udemy.com/course/nextjs-react-the-complete-guide/', price: 14.99, duration: 25, rating: 4.7, difficulty: 'intermediate' },
    { title: 'Next.js Official Learn Course', platform: 'Vercel', url: 'https://nextjs.org/learn', price: 0, duration: 10, rating: 4.8, difficulty: 'beginner' },
  ],
  nextjs: [
    { title: 'Next.js & React - The Complete Guide', platform: 'Udemy', url: 'https://www.udemy.com/course/nextjs-react-the-complete-guide/', price: 14.99, duration: 25, rating: 4.7, difficulty: 'intermediate' },
    { title: 'Next.js Official Learn Course', platform: 'Vercel', url: 'https://nextjs.org/learn', price: 0, duration: 10, rating: 4.8, difficulty: 'beginner' },
  ],
};

interface MLSkillGapResponse {
  current_skills: string[];
  target_role: string;
  skill_coverage: number;
  matched_count: number;
  total_target_skills: number;
  missing_skills: Array<{
    name: string;
    category: string;
    priority: string;
    frequency: string;
    estimated_hours: number;
    salary_impact: string;
    roi_score: number;
  }>;
  recommended_learning_path: Array<{
    phase: string;
    description: string;
    total_hours: number;
    skills: Array<{
      name: string;
      category: string;
      estimated_hours: number;
      priority: string;
      roi_score: number;
    }>;
  }>;
  category_breakdown: Array<{
    category: string;
    current: number;
    target: number;
    matched: number;
  }>;
  total_estimated_hours: number;
  summary: string;
}

export class SkillGapService {
  async analyzeSkillGap(
    userId: string,
    cvText: string,
    parsedData: Record<string, any>,
    targetRole?: string,
    targetJobDescription?: string,
  ): Promise<MLSkillGapResponse & { learning_path_ids: string[] }> {
    // Call ML service
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let mlResult: MLSkillGapResponse;
    try {
      const response = await fetch(`${ML_SERVICE_URL}/api/ml/skill-gap-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cv_text: cvText,
          parsed_data: parsedData,
          target_role: targetRole,
          target_job_description: targetJobDescription,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`ML service returned ${response.status}`);
      }

      const responseData = await response.json();
      mlResult = responseData.data;
    } finally {
      clearTimeout(timeoutId);
    }

    // Batch upsert all skills in parallel
    const upsertedSkills = await Promise.all(
      mlResult.missing_skills.map((missingSkill) =>
        prisma.skill.upsert({
          where: { name: missingSkill.name },
          update: {},
          create: {
            name: missingSkill.name,
            category: missingSkill.category,
            description: `${missingSkill.priority} priority skill for ${mlResult.target_role.replace(/_/g, ' ')}`,
          },
        })
      )
    );

    // Delete stale not-started paths that aren't in current analysis
    const currentSkillIds = new Set(upsertedSkills.map((skill) => skill.id));
    await prisma.learningPath.deleteMany({
      where: {
        userId,
        skillId: { notIn: [...currentSkillIds] },
        status: 'not_started',
      },
    });

    // Find existing learning paths for this user in one query
    const existingPaths = await prisma.learningPath.findMany({
      where: { userId, skillId: { in: upsertedSkills.map((skill) => skill.id) } },
    });
    const existingSkillIds = new Set(existingPaths.map((path) => path.skillId));

    // Create only the missing learning paths + seed courses in parallel
    const learningPathIds: string[] = existingPaths.map((path) => path.id);

    const skillsNeedingPaths = upsertedSkills.filter((skill) => !existingSkillIds.has(skill.id));
    const newPathPromises = skillsNeedingPaths.map(async (skill) => {
      const matchingMissingSkill = mlResult.missing_skills.find((ms) => ms.name === skill.name);
      const priorityValue = matchingMissingSkill?.priority === 'high' ? 1 : matchingMissingSkill?.priority === 'medium' ? 2 : 3;

      const learningPath = await prisma.learningPath.create({
        data: {
          userId,
          skillId: skill.id,
          priority: priorityValue,
          estimatedHours: matchingMissingSkill?.estimated_hours ?? 40,
          status: 'not_started',
          progressPercentage: 0,
        },
      });
      learningPathIds.push(learningPath.id);

      await this.seedCoursesForSkill(skill.id, skill.name);
    });
    await Promise.all(newPathPromises);

    // Cache result
    await cache.set(`skill-gap:${userId}`, mlResult, 3600);

    return { ...mlResult, learning_path_ids: learningPathIds };
  }

  async getLearningPaths(userId: string) {
    return prisma.learningPath.findMany({
      where: { userId },
      include: { skill: true },
      orderBy: { priority: 'asc' },
    });
  }

  async getLearningPathWithCourses(userId: string, learningPathId: string) {
    const learningPath = await prisma.learningPath.findFirst({
      where: { id: learningPathId, userId },
      include: {
        skill: {
          include: {
            courses: {
              include: {
                userCourses: {
                  where: { userId },
                },
              },
            },
          },
        },
      },
    });

    if (!learningPath) return null;

    return learningPath;
  }

  async updateLearningPathProgress(
    userId: string,
    learningPathId: string,
    progressPercentage: number,
  ) {
    const learningPath = await prisma.learningPath.findFirst({
      where: { id: learningPathId, userId },
    });

    if (!learningPath) return null;

    const now = new Date();
    let status = 'not_started';
    let startedAt = learningPath.startedAt;
    let completedAt = learningPath.completedAt;

    if (progressPercentage >= 100) {
      status = 'completed';
      completedAt = now;
      if (!startedAt) startedAt = now;
    } else if (progressPercentage > 0) {
      status = 'in_progress';
      if (!startedAt) startedAt = now;
      completedAt = null;
    }

    return prisma.learningPath.update({
      where: { id: learningPathId },
      data: {
        progressPercentage: Math.min(100, Math.max(0, progressPercentage)),
        status,
        startedAt,
        completedAt,
      },
      include: { skill: true },
    });
  }

  async updateCourseProgress(
    userId: string,
    courseId: string,
    progress: number,
    status: string,
  ) {
    // Verify the course belongs to a skill in the user's learning paths
    const courseWithPath = await prisma.course.findFirst({
      where: {
        id: courseId,
        skill: { learningPaths: { some: { userId } } },
      },
    });
    if (!courseWithPath) return null;

    const now = new Date();
    const startedAt = progress > 0 ? now : undefined;
    const completedAt = (status === 'completed' || progress >= 100) ? now : null;

    const userCourse = await prisma.userCourse.upsert({
      where: {
        userId_courseId: { userId, courseId },
      },
      update: {
        progress: Math.min(100, Math.max(0, progress)),
        status,
        completedAt,
      },
      create: {
        userId,
        courseId,
        progress: Math.min(100, Math.max(0, progress)),
        status,
        ...(startedAt !== undefined && { startedAt }),
        completedAt,
      },
      include: { course: true },
    });

    // Recalculate parent learning path progress
    if (userCourse.course?.skillId) {
      const learningPath = await prisma.learningPath.findFirst({
        where: { userId, skillId: userCourse.course.skillId },
      });

      if (learningPath) {
        const allCourses = await prisma.course.findMany({
          where: { skillId: userCourse.course.skillId },
          include: { userCourses: { where: { userId } } },
        });

        if (allCourses.length > 0) {
          const totalProgress = allCourses.reduce((sum, course) => {
            const userCourseEntry = course.userCourses[0];
            return sum + (userCourseEntry?.progress ?? 0);
          }, 0);
          const averageProgress = Math.round(totalProgress / allCourses.length);

          await this.updateLearningPathProgress(userId, learningPath.id, averageProgress);
        }
      }
    }

    return userCourse;
  }

  async getProgressSummary(userId: string) {
    const learningPaths = await prisma.learningPath.findMany({
      where: { userId },
      include: { skill: true },
    });

    const totalPaths = learningPaths.length;
    const completedPaths = learningPaths.filter(lp => lp.status === 'completed').length;
    const inProgressPaths = learningPaths.filter(lp => lp.status === 'in_progress').length;
    const notStartedPaths = learningPaths.filter(lp => lp.status === 'not_started').length;

    const totalEstimatedHours = learningPaths.reduce(
      (sum, lp) => sum + (lp.estimatedHours ?? 0), 0
    );
    const completedHours = learningPaths.reduce((sum, lp) => {
      const hours = lp.estimatedHours ?? 0;
      return sum + Math.round(hours * lp.progressPercentage / 100);
    }, 0);

    const overallProgress = totalPaths > 0
      ? Math.round(learningPaths.reduce((sum, lp) => sum + lp.progressPercentage, 0) / totalPaths)
      : 0;

    return {
      totalPaths,
      completedPaths,
      inProgressPaths,
      notStartedPaths,
      totalEstimatedHours,
      completedHours,
      overallProgress,
      paths: learningPaths.map(lp => ({
        id: lp.id,
        skillName: lp.skill.name,
        skillCategory: lp.skill.category,
        priority: lp.priority,
        status: lp.status,
        progressPercentage: lp.progressPercentage,
        estimatedHours: lp.estimatedHours,
        startedAt: lp.startedAt,
        completedAt: lp.completedAt,
      })),
    };
  }

  private async seedCoursesForSkill(skillId: string, skillName: string) {
    const catalogEntries = COURSE_CATALOG[skillName.toLowerCase()];
    if (!catalogEntries) return;

    // Check which courses already exist in one query
    const existingCourses = await prisma.course.findMany({
      where: { skillId, title: { in: catalogEntries.map((entry) => entry.title) } },
      select: { title: true },
    });
    const existingTitles = new Set(existingCourses.map((course) => course.title));

    const coursesToCreate = catalogEntries
      .filter((entry) => !existingTitles.has(entry.title))
      .map((entry) => ({
        skillId,
        title: entry.title,
        platform: entry.platform,
        url: entry.url,
        price: entry.price,
        duration: entry.duration,
        rating: entry.rating,
        difficulty: entry.difficulty,
      }));

    if (coursesToCreate.length > 0) {
      await prisma.course.createMany({ data: coursesToCreate });
    }
  }
}
