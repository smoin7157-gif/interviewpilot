-- AlterTable
ALTER TABLE "interview_questions" ADD COLUMN "sourceContext" JSONB;

-- AlterTable
ALTER TABLE "interview_sessions" ADD COLUMN "githubContext" JSONB;
ALTER TABLE "interview_sessions" ADD COLUMN "githubUrl" TEXT;
ALTER TABLE "interview_sessions" ADD COLUMN "resumeContext" JSONB;
ALTER TABLE "interview_sessions" ADD COLUMN "resumeFileName" TEXT;

-- CreateTable
CREATE TABLE "candidate_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "repositoryUrl" TEXT,
    "description" TEXT,
    "techStack" TEXT,
    "contribution" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "candidate_projects_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "interview_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "candidate_projects_sessionId_idx" ON "candidate_projects"("sessionId");
