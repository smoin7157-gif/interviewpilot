-- Indexes for the hottest read paths (list pagination, progress counts, and
-- latest-attempt lookups). Each composite covers its single-column prefix, so
-- the superseded single-column indexes are dropped rather than kept.

-- DropIndex
DROP INDEX "interview_sessions_userId_idx";

-- DropIndex
DROP INDEX "question_attempts_userId_idx";

-- DropIndex
DROP INDEX "question_attempts_questionId_idx";

-- CreateIndex
CREATE INDEX "interview_sessions_userId_updatedAt_idx" ON "interview_sessions"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "interview_questions_sessionId_status_idx" ON "interview_questions"("sessionId", "status");

-- CreateIndex
CREATE INDEX "question_attempts_userId_createdAt_idx" ON "question_attempts"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "question_attempts_questionId_createdAt_idx" ON "question_attempts"("questionId", "createdAt");
