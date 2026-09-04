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

export const CATEGORIES = ["Technical", "Behavioral", "Project", "Role-specific", "General"] as const;
export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

export const QUESTION_STATUSES = ["NOT_STARTED", "PRACTICED", "SKIPPED"] as const;

/** Optional chip-style field: empty string means "not selected". */
const optionalChoice = <T extends readonly string[]>(options: T) =>
  z.enum(options).optional().or(z.literal(""));

export const createInterviewSchema = z.object({
  role: z.string().trim().min(2, "Enter a job role.").max(120, "Role is too long."),
  seniority: z.enum(EXPERIENCE_OPTIONS),
  company: z.string().trim().max(120, "Company name is too long.").optional().or(z.literal("")),
  companyType: optionalChoice(COMPANY_TYPE_OPTIONS),
  interviewType: optionalChoice(INTERVIEW_TYPE_OPTIONS),
  jobDescription: z.string().trim().max(12_000, "Job description is too long.").optional().or(z.literal("")),
  questionCount: z.coerce
    .number()
    .int()
    .refine((n) => (QUESTION_COUNT_OPTIONS as readonly number[]).includes(n), {
      message: "Pick 10, 15, or 20 questions.",
    })
    .default(10),
});

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80, "Name is too long."),
  email: z.string().trim().email("Enter a valid email address.").max(200),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
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
  newPassword: z.string().min(8, "New password must be at least 8 characters.").max(200),
});

export const evaluateSchema = z.object({
  answer: z.string().trim().min(10, "Write a real answer first (at least a few sentences).").max(10_000),
  prompt: z.string().trim().max(5_000).optional().or(z.literal("")),
});

export const practiceStatusSchema = z.object({
  status: z.enum(["PRACTICED", "SKIPPED", "NOT_STARTED"]),
});

export type CreateInterviewInput = z.infer<typeof createInterviewSchema>;
