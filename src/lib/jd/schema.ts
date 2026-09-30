import { z } from "zod";

/**
 * Job-description seed schema (techjd).
 *
 * One shape, shared by the generator, the dedup pass, the JSON data file, and
 * (later) the Prisma seed / fallback index. Every generated object must pass
 * this before it is written — malformed entries are rejected and regenerated,
 * never persisted.
 */

export const SENIORITIES = ["entry", "mid", "senior"] as const;
export const COMPANY_TYPES = ["startup", "mid-size", "enterprise"] as const;

/** Seniority is the single source of truth; yearsExperience must agree with it. */
export const YEARS_BY_SENIORITY = {
  entry: "0-2",
  mid: "3-5",
  senior: "6+",
} as const;

/**
 * Terms that are not a technology and must never appear in `requiredSkills`.
 * The request explicitly calls this out ("actual tech stack, not
 * 'programming'"). Kept narrow so legitimate skills are untouched.
 */
const GENERIC_SKILL =
  /^(?:programming|coding|software(?: development)?|teamwork|team work|communication|problem[- ]?solving|hard work|leadership|english|computer science|it skills)$/i;

export const jobDescriptionSchema = z
  .object({
    role: z.string().trim().min(3, "role is too short").max(80),
    seniority: z.enum(SENIORITIES),
    companyType: z.enum(COMPANY_TYPES),
    responsibilities: z
      .array(z.string().trim().min(15, "responsibility is too generic").max(400))
      .min(3)
      .max(5),
    requiredSkills: z
      .array(z.string().trim().min(1).max(120))
      .min(3)
      .max(12)
      .refine((skills) => skills.every((s) => !GENERIC_SKILL.test(s)), {
        message: "requiredSkills contains a generic non-technology term",
      }),
    niceToHave: z.array(z.string().trim().min(1).max(200)).min(2).max(4),
    yearsExperience: z.enum(["0-2", "3-5", "6+"]),
    interviewFocusAreas: z.array(z.string().trim().min(3).max(160)).min(2).max(3),
  })
  .refine((jd) => YEARS_BY_SENIORITY[jd.seniority] === jd.yearsExperience, {
    message: "yearsExperience does not match seniority",
    path: ["yearsExperience"],
  });

export type JobDescription = z.infer<typeof jobDescriptionSchema>;
export type Seniority = (typeof SENIORITIES)[number];
export type CompanyType = (typeof COMPANY_TYPES)[number];
