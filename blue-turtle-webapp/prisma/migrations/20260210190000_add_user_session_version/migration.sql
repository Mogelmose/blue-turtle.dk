-- Add a session version counter so password changes can invalidate existing JWT sessions.
ALTER TABLE "User"
ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
