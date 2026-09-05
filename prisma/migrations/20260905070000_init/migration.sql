-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "seniority" TEXT NOT NULL,
    "company" TEXT,
    "companyType" TEXT,
    "interviewType" TEXT,
    "jobDescription" TEXT,
    "githubUrl" TEXT,
    "githubContext" JSONB,
    "resumeFileName" TEXT,
    "resumeContext" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "questionCountTarget" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_projects" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "repositoryUrl" TEXT,
    "description" TEXT,
    "techStack" TEXT,
    "contribution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_questions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "suggestedAnswer" TEXT NOT NULL,
    "followUps" JSONB NOT NULL,
    "sourceContext" JSONB,
    "orderIndex" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "prompt" TEXT,
    "answer" TEXT NOT NULL,
    "score" INTEGER,
    "feedback" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_interview_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "interviewSessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SESSION_STARTED',
    "maxQuestions" INTEGER NOT NULL DEFAULT 10,
    "overallScore" INTEGER,
    "debrief" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_interview_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_turns" (
    "id" TEXT NOT NULL,
    "mockSessionId" TEXT NOT NULL,
    "turnIndex" INTEGER NOT NULL,
    "speaker" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "action" TEXT,
    "category" TEXT,
    "difficulty" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_turns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "interview_sessions_userId_idx" ON "interview_sessions"("userId");

-- CreateIndex
CREATE INDEX "candidate_projects_sessionId_idx" ON "candidate_projects"("sessionId");

-- CreateIndex
CREATE INDEX "interview_questions_sessionId_orderIndex_idx" ON "interview_questions"("sessionId", "orderIndex");

-- CreateIndex
CREATE INDEX "question_attempts_userId_idx" ON "question_attempts"("userId");

-- CreateIndex
CREATE INDEX "question_attempts_questionId_idx" ON "question_attempts"("questionId");

-- CreateIndex
CREATE INDEX "mock_interview_sessions_userId_idx" ON "mock_interview_sessions"("userId");

-- CreateIndex
CREATE INDEX "mock_interview_sessions_interviewSessionId_status_idx" ON "mock_interview_sessions"("interviewSessionId", "status");

-- CreateIndex
CREATE INDEX "interview_turns_mockSessionId_turnIndex_idx" ON "interview_turns"("mockSessionId", "turnIndex");

-- AddForeignKey
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_projects" ADD CONSTRAINT "candidate_projects_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "interview_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_interview_sessions" ADD CONSTRAINT "mock_interview_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_interview_sessions" ADD CONSTRAINT "mock_interview_sessions_interviewSessionId_fkey" FOREIGN KEY ("interviewSessionId") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_turns" ADD CONSTRAINT "interview_turns_mockSessionId_fkey" FOREIGN KEY ("mockSessionId") REFERENCES "mock_interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

