-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'GENERATE_VIDEO_PREVIEW';

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "previewPath" TEXT;
