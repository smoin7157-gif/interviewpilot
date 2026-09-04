-- AlterTable
ALTER TABLE "interview_sessions" ADD COLUMN "companyType" TEXT;
ALTER TABLE "interview_sessions" ADD COLUMN "interviewType" TEXT;

-- Remap legacy seniority values onto the InterviewOS experience-level vocabulary.
UPDATE "interview_sessions" SET "seniority" = 'Fresher'    WHERE "seniority" = 'Intern';
UPDATE "interview_sessions" SET "seniority" = '0–1 years'  WHERE "seniority" = 'Entry Level';
UPDATE "interview_sessions" SET "seniority" = '1–3 years'  WHERE "seniority" = 'Junior';
UPDATE "interview_sessions" SET "seniority" = '3–5 years'  WHERE "seniority" = 'Mid Level';
UPDATE "interview_sessions" SET "seniority" = '5+ years'   WHERE "seniority" = 'Senior';
UPDATE "interview_sessions" SET "seniority" = '5+ years'   WHERE "seniority" = 'Lead';
