// apps/frontend/types/profile.ts

/**
 * User Profile interface matching the backend UserProfile model
 * Based on Prisma schema: apps/backend/prisma/schema.prisma
 */
export interface Profile {
  id: string;
  userId: string;
  phoneNumber?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}
