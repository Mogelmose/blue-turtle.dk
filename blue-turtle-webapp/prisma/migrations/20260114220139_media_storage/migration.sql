-- CreateEnum
CREATE TYPE "MetadataStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "LocationSource" AS ENUM ('EXIF', 'VIDEO_META', 'NONE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('EXTRACT_METADATA');

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "capturedAt" TIMESTAMP(3),
ADD COLUMN     "filename" TEXT,
ADD COLUMN     "locationAutoLat" DOUBLE PRECISION,
ADD COLUMN     "locationAutoLng" DOUBLE PRECISION,
ADD COLUMN     "locationSource" "LocationSource",
ADD COLUMN     "metadataStatus" "MetadataStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "originalName" TEXT,
ADD COLUMN     "sizeBytes" INTEGER,
ADD COLUMN     "storagePath" TEXT;

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_type_status_idx" ON "Job"("type", "status");

-- CreateIndex
CREATE INDEX "Media_albumId_filename_idx" ON "Media"("albumId", "filename");
