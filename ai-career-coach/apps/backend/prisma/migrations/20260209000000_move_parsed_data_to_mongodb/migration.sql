-- AlterTable: Remove parsed_data column and add mongo_doc_id reference
ALTER TABLE "cvs" DROP COLUMN IF EXISTS "parsed_data";
ALTER TABLE "cvs" ADD COLUMN "mongo_doc_id" VARCHAR(50);
