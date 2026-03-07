// scripts/seed-admin.ts
// CLI tool to create or promote an admin user
// Usage: npx tsx scripts/seed-admin.ts <email> [password]

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email) {
    console.error('Usage: npx tsx scripts/seed-admin.ts <email> [password]');
    console.error('  If user exists, promotes to ADMIN.');
    console.error('  If user does not exist, creates with ADMIN role (password required).');
    process.exit(1);
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      if (existingUser.role === 'ADMIN') {
        console.log(`User ${email} is already an ADMIN. No changes made.`);
      } else {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { role: 'ADMIN' },
        });
        console.log(`Promoted ${email} to ADMIN.`);
      }
    } else {
      if (!password) {
        console.error('Password is required when creating a new admin user.');
        console.error('Usage: npx tsx scripts/seed-admin.ts <email> <password>');
        process.exit(1);
      }

      const passwordHash = await bcrypt.hash(password, 10);

      await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: 'ADMIN',
          isEmailVerified: true,
        },
      });
      console.log(`Created new ADMIN user: ${email}`);
    }
  } catch (error) {
    console.error('Failed to seed admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
