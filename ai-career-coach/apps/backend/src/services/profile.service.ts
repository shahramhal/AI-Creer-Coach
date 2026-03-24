import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ProfileUpdateData {
  phoneNumber?: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  bio?: string;
  jobTitle?: string;
}

interface CareerPreferencesData {
  targetRole?: string | null;
  experienceLevel?: string | null;
  targetCompanies?: string[] | null;
  country?: string | null;
  region?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  workArrangements?: string[] | null;
  preferredJobTypes?: string[] | null;
  jobTitle?: string | null;
}

interface UserUpdateData {
  firstName?: string;
  lastName?: string;
}

export class ProfileService {
  async getProfile(userId: string) {
    let profile = await prisma.userProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      profile = await prisma.userProfile.create({
        data: {
          userId,
        },
      });
    }
    return profile;
  }

  async updateProfile(userId: string, data: ProfileUpdateData) {
    await this.getProfile(userId);

    return await prisma.userProfile.update({
      where: { userId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async updateProfileWithUser(
    userId: string,
    profileData: ProfileUpdateData,
    userData: UserUpdateData
  ) {
    await this.getProfile(userId);

    const [updatedUser, updatedProfile] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: userData,
      }),
      prisma.userProfile.update({
        where: { userId },
        data: {
          ...profileData,
          updatedAt: new Date(),
        },
      }),
    ]);

    return { user: updatedUser, profile: updatedProfile };
  }

  async getCareerPreferences(userId: string) {
    const profile = await this.getProfile(userId);
    return {
      targetRole: profile.targetRole,
      experienceLevel: profile.experienceLevel,
      targetCompanies: profile.targetCompanies,
      country: profile.country,
      region: profile.region,
      salaryMin: profile.salaryMin,
      salaryMax: profile.salaryMax,
      workArrangements: profile.workArrangements,
      preferredJobTypes: profile.preferredJobTypes,
      jobTitle: profile.jobTitle,
    };
  }

  async updateCareerPreferences(userId: string, data: CareerPreferencesData) {
    await this.getProfile(userId);

    return await prisma.userProfile.update({
      where: { userId },
      data: {
        targetRole: data.targetRole ?? null,
        experienceLevel: data.experienceLevel ?? null,
        targetCompanies: data.targetCompanies ?? [],
        country: data.country ?? null,
        region: data.region ?? null,
        salaryMin: data.salaryMin ?? null,
        salaryMax: data.salaryMax ?? null,
        workArrangements: data.workArrangements ?? [],
        preferredJobTypes: data.preferredJobTypes ?? [],
        jobTitle: data.jobTitle ?? null,
        updatedAt: new Date(),
      },
    });
  }

  async updateAvatar(userId: string, avatarUrl: string | null) {
    return await prisma.userProfile.update({
      where: { userId },
      data: {
        avatarUrl,
        updatedAt: new Date(),
      },
    });
  }
}
