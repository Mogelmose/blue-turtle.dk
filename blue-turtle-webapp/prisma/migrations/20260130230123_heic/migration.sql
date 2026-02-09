-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'CONVERT_HEIC';

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "convertedPath" TEXT;
