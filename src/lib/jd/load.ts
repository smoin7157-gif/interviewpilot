import { jobDescriptionSchema, YEARS_BY_SENIORITY, type JobDescription } from "./schema";

/**
 * Pure mapping between the committed JD seed dataset
 * (`prisma/seed-data/job-descriptions.json`) and the rows of the
 * `job_description_templates` table (Phase 6).
 *
 * The JSON file stays the source of truth; this module turns it into a load
 * plan the script (`scripts/load-job-descriptions.ts`) writes to the DB. It is
 * deliberately DB-free so tests can pin the whole mapping offline — the loader
 * must never invent, reorder into ambiguity, or silently drop a malformed
 * entry without reporting it.
 */

/** One `job_description_templates` row, ready for `createMany`. */
export interface JdTemplateRow {
  role: string;
  seniority: string;
  companyType: string;
  /** 0-based position within its role|seniority|companyType combo, in dataset order. */
  variantIndex: number;
  yearsExperience: string;
  responsibilities: string[];
  requiredSkills: string[];
  niceToHave: string[];
  interviewFocusAreas: string[];
}

export interface RejectedEntry {
  /** Index in the dataset array, so a failure points at the exact line. */
  index: number;
  reason: string;
}

export interface JdLoadPlan {
  rows: JdTemplateRow[];
  rejected: RejectedEntry[];
}

/** Map one validated dataset entry to a table row. */
export function toTemplateRow(jd: JobDescription, variantIndex: number): JdTemplateRow {
  return {
    role: jd.role,
    seniority: jd.seniority,
    companyType: jd.companyType,
    variantIndex,
    yearsExperience: jd.yearsExperience,
    responsibilities: jd.responsibilities,
    requiredSkills: jd.requiredSkills,
    niceToHave: jd.niceToHave,
    interviewFocusAreas: jd.interviewFocusAreas,
  };
}

/**
 * Validate a raw (untyped) dataset array and build the full load plan.
 *
 * - Every entry must pass `jobDescriptionSchema`; malformed entries are
 *   collected in `rejected` with their index and the first zod issue, and are
 *   never turned into rows.
 * - `variantIndex` is assigned per role|seniority|companyType combo in dataset
 *   order, matching how the generator wrote the file — so a re-load of an
 *   unchanged dataset produces identical rows.
 */
export function buildLoadPlan(raw: unknown[]): JdLoadPlan {
  const rows: JdTemplateRow[] = [];
  const rejected: RejectedEntry[] = [];
  const seenPerCombo = new Map<string, number>();

  raw.forEach((entry, index) => {
    const parsed = jobDescriptionSchema.safeParse(entry);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const where = issue ? ` at ${issue.path.join(".") || "(root)"}` : "";
      rejected.push({
        index,
        reason: (issue?.message ?? "invalid entry") + where,
      });
      return;
    }
    const jd = parsed.data;
    const combo = `${jd.role}|${jd.seniority}|${jd.companyType}`;
    const variantIndex = seenPerCombo.get(combo) ?? 0;
    seenPerCombo.set(combo, variantIndex + 1);
    rows.push(toTemplateRow(jd, variantIndex));
  });

  return { rows, rejected };
}

/**
 * The seniority → yearsExperience agreement the schema enforces, re-exposed so
 * callers (and tests) can assert it without reaching into zod internals.
 */
export function yearsForSeniority(seniority: string): string | null {
  return (YEARS_BY_SENIORITY as Record<string, string>)[seniority] ?? null;
}
