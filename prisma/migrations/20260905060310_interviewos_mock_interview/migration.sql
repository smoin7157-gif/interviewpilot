-- CreateTable
CREATE TABLE "mock_interview_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "interviewSessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SESSION_STARTED',
    "maxQuestions" INTEGER NOT NULL DEFAULT 10,
    "overallScore" INTEGER,
    "debrief" JSONB,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "mock_interview_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mock_interview_sessions_interviewSessionId_fkey" FOREIGN KEY ("interviewSessionId") REFERENCES "interview_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "interview_turns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mockSessionId" TEXT NOT NULL,
    "turnIndex" INTEGER NOT NULL,
    "speaker" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "action" TEXT,
    "category" TEXT,
    "difficulty" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "interview_turns_mockSessionId_fkey" FOREIGN KEY ("mockSessionId") REFERENCES "mock_interview_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "mock_interview_sessions_userId_idx" ON "mock_interview_sessions"("userId");

-- CreateIndex
CREATE INDEX "mock_interview_sessions_interviewSessionId_status_idx" ON "mock_interview_sessions"("interviewSessionId", "status");

-- CreateIndex
CREATE INDEX "interview_turns_mockSessionId_turnIndex_idx" ON "interview_turns"("mockSessionId", "turnIndex");
