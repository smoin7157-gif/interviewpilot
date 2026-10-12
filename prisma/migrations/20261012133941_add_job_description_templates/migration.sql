-- CreateTable
CREATE TABLE "job_description_templates" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "seniority" TEXT NOT NULL,
    "companyType" TEXT NOT NULL,
    "variantIndex" INTEGER NOT NULL,
    "yearsExperience" TEXT NOT NULL,
    "responsibilities" JSONB NOT NULL,
    "requiredSkills" JSONB NOT NULL,
    "niceToHave" JSONB NOT NULL,
    "interviewFocusAreas" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_description_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_description_templates_role_seniority_idx" ON "job_description_templates"("role", "seniority");

-- CreateIndex
CREATE UNIQUE INDEX "job_description_templates_role_seniority_companyType_varian_key" ON "job_description_templates"("role", "seniority", "companyType", "variantIndex");
