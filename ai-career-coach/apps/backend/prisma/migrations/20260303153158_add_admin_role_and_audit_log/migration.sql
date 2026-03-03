-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "ats_analyzed_at" TIMESTAMP,
ADD COLUMN     "ats_breakdown" JSONB,
ADD COLUMN     "ats_score" INTEGER,
ADD COLUMN     "cv_id" UUID,
ADD COLUMN     "keywords_matched" JSONB,
ADD COLUMN     "keywords_missing" JSONB;

-- AlterTable
ALTER TABLE "cvs" ADD COLUMN     "overview_data" JSONB;

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "job_title" VARCHAR(255);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_disabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_login_at" TIMESTAMP,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "target_type" VARCHAR(50) NOT NULL,
    "target_id" VARCHAR(255),
    "details" JSONB,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_audit_admin" ON "admin_audit_logs"("admin_id");

-- CreateIndex
CREATE INDEX "idx_audit_action" ON "admin_audit_logs"("action");

-- CreateIndex
CREATE INDEX "idx_audit_created" ON "admin_audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
