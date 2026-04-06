import { prisma } from '../config/database.js';
import { logger } from './logger.js';

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
      logger.error(error);
    });
}
