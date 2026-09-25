import { z } from "zod";

/** Experience levels — InterviewOS vocabulary. Stored in the `seniority` column. */
export const EXPERIENCE_OPTIONS = [
  "Fresher",
  "0–1 years",
  "1–3 years",
  "3–5 years",
  "5+ years",
] as const;

export const COMPANY_TYPE_OPTIONS = [
  "Product Company",
  "Service Company",
  "Startup",
  "MNC",
  "Consulting",
  "Other",
] as const;

export const INTERVIEW_TYPE_OPTIONS = [
  "General",
  "Technical",
  "Behavioral",
  "HR / Recruiter",
  "Coding",
  "System Design",
  "Data / ML",
  "Product",
  "Mixed",
] as const;

export const QUESTION_COUNT_OPTIONS = [10, 15, 20] as const;

/** InterviewOS question-category keys (lowercase) used by the question engine. */
export const QUESTION_CATEGORIES = [
  "technical",
  "behavioral",
  "project",
  "job_description",
  "coding",
  "system_design",
  "data_ml",
  "company",
  "general",
] as const;

// Legacy capitalized set (kept for display/back-compat of older rows).

/** Optional chip-style field: empty string means "not selected". */
const optionalChoice = <T extends readonly string[]>(options: T) =>
  z.enum(options).optional().or(z.literal(""));

export const candidateProjectSchema = z.object({
  name: z.string().trim().min(2, "Project name is required.").max(120, "Project name is too long."),
  repositoryUrl: z.string().trim().max(300, "Repository URL is too long.").optional().or(z.literal("")),
  description: z.string().trim().max(2_000, "Project description is too long.").optional().or(z.literal("")),
  techStack: z.string().trim().max(500, "Tech stack is too long.").optional().or(z.literal("")),
  contribution: z.string().trim().max(2_000, "Contribution is too long.").optional().or(z.literal("")),
});

export const createInterviewSchema = z.object({
  role: z.string().trim().min(2, "Enter a job role.").max(120, "Role is too long."),
  seniority: z.enum(EXPERIENCE_OPTIONS),
  company: z.string().trim().max(120, "Company name is too long.").optional().or(z.literal("")),
  companyType: optionalChoice(COMPANY_TYPE_OPTIONS),
  interviewType: optionalChoice(INTERVIEW_TYPE_OPTIONS),
  jobDescription: z.string().trim().max(12_000, "Job description is too long.").optional().or(z.literal("")),
  githubUrl: z.string().trim().max(300, "GitHub URL is too long.").optional().or(z.literal("")),
  projects: z.array(candidateProjectSchema).max(8, "Add at most 8 projects.").optional().default([]),
  questionCount: z.coerce
    .number()
    .int()
    .refine((n) => (QUESTION_COUNT_OPTIONS as readonly number[]).includes(n), {
      message: "Pick 10, 15, or 20 questions.",
    })
    .default(10),
});

/**
 * Password policy: length is checked by `.min()`, this adds a mild complexity
 * floor — letters plus a digit — without forcing symbol soup that students
 * write down on sticky notes. Returns a readable message for form display.
 */
export function passwordComplexityError(password: string): string | undefined {
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include at least one letter and one number.";
  }
  return undefined;
}

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80, "Name is too long."),
  email: z.string().trim().email("Enter a valid email address.").max(200),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(200)
    .refine((p) => passwordComplexityError(p) === undefined, {
      message: "Password must include at least one letter and one number.",
    }),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(200),
  password: z.string().min(1, "Enter your password.").max(200),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80, "Name is too long."),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters.")
    .max(200)
    .refine((p) => passwordComplexityError(p) === undefined, {
      message: "Password must include at least one letter and one number.",
    }),
});

export const evaluateSchema = z.object({
  answer: z.string().trim().min(10, "Write a real answer first (at least a few sentences).").max(10_000),
  prompt: z.string().trim().max(5_000).optional().or(z.literal("")),
});

export const practiceStatusSchema = z.object({
  status: z.enum(["PRACTICED", "SKIPPED", "NOT_STARTED"]),
});

/**
 * Autosaved written-practice draft. Deliberately permissive — a draft is a
 * work-in-progress, so short/partial answers are valid; only the same 10k cap
 * as `evaluateSchema` applies, so anything that can be saved can be evaluated.
 * An empty `draftAnswer` clears the stored draft.
 */
export const questionDraftSchema = z.object({
  questionId: z.string().trim().min(1, "Question is required.").max(64),
  draftAnswer: z.string().max(10_000, "Draft is too long."),
});

export type CreateInterviewInput = z.infer<typeof createInterviewSchema>;/* ----------------------- AI mock interview (Phase 3) ----------------------- */



export const mockCreateSchema = z.object({
  interviewSessionId: z.string().trim().min(1, "Interview session is required.").max(64),
  maxQuestions: z.coerce
    .number()
    .int()
    .min(4, "At least 4 questions per mock.")
    .max(20, "At most 20 questions per mock.")
    .default(10),
});

export const mockTurnSchema = z.object({
  /** Candidate's spoken transcript. Empty on the very first call (opening). */
  transcript: z.string().trim().max(6_000, "Answer is too long.").optional().default(""),
});

export const mockEndSchema = z.object({
  reason: z.enum(["user", "ai"]).default("user"),
});

export type MockCreateInput = z.infer<typeof mockCreateSchema>;
export type MockTurnInput = z.infer<typeof mockTurnSchema>;
export type MockEndInput = z.infer<typeof mockEndSchema>;
