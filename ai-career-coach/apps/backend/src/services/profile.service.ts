import { PrismaClient } from "@prisma/client";

const prisma =new PrismaClient();

export class ProfileService{
    /**Get user profile or create new one  */
    async getProfile(userId:string){
        let profile =await prisma.userProfile.findUnique({
            where:{userId},
        });
        if (!profile){
            profile=await prisma.userProfile.create({
                data:{
                    userId,
                }
            });
        }
        return profile;
    
    }
    /**update  Profile */
    async updateProfile(userId:string, data: profileUpdateData){
        /**if it is exist */
        const existing =await this.getProfile(userId);

        //update
        return await prisma.userProfile.update({
            where:{userId},
            data:{
                ...data,
               updatedAt: new Date()
            }
        });
            }
        // upload the avatar
    async updateAvatar(userId:string, avatarUrl:string | null){
        return await prisma.userProfile.update({
            where:{userId},
            data:{ avatarUrl,
                updatedAt: new Date()
             },
        });

    }
}
interface profileUpdateData{
  phoneNumber?: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  bio?: string;
}

