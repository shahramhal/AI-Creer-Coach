/**
 * Migration script: Copy analysisData → overviewData for existing CVs.
 *
 * During the transition period both fields share the same structure,
 * so existing users will see their scores without needing to re-analyze.
 *
 * Usage:
 *   npx tsx scripts/migrate-overview-data.ts
 *
 * Safe to run multiple times — only updates CVs where overviewData is null.
 */

import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting overview data migration...');

  // Find all CVs that have analysisData but no overviewData
  // Prisma requires JsonNullValueFilter for nullable Json fields
  const cvsToMigrate = await prisma.cV.findMany({
    where: {
      analysisData: { not: Prisma.JsonNull },
      overviewData: { equals: Prisma.JsonNull },
    },
    select: {
      id: true,
      analysisData: true,
    },
  });

  console.log(`Found ${cvsToMigrate.length} CVs to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const cv of cvsToMigrate) {
    try {
      await prisma.cV.update({
        where: { id: cv.id },
        data: { overviewData: cv.analysisData },
      });
      migrated++;
    } catch (error) {
      console.error(`Failed to migrate CV ${cv.id}:`, error);
      skipped++;
    }
  }

  console.log(`Migration complete: ${migrated} migrated, ${skipped} skipped`);
}

main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
