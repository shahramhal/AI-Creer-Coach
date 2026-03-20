import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function logUserActivity(
  userId: string,
  type: string,
  title: string,
  description: string
): void {
  prisma.userActivity
    .create({
      data: { userId, type, title, description },
    })
    .catch((error) => {
      console.error('Activity log write failed:', error);
    });
}
