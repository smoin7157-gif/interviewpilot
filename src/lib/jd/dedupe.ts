import type { JobDescription } from "./schema";

/**
 * Near-duplicate removal for the JD seed set.
 *
 * Uses the SAME token-overlap fingerprint approach already used for
 * cross-session question variation (see `src/lib/ai/validate.ts`):
 *   - fingerprint = unique word tokens of length >= 4, lowercased
 *   - near-duplicate when shared / min(len) >= threshold
 *
 * Two deliberate differences from the question-level logic:
 *   1. JDs are compared only WITHIN the same role|seniority|companyType bucket,
 *      so a Frontend startup JD is never "similar to" a Backend enterprise JD
 *      just because they share industry vocabulary.
 *   2. The default threshold is 0.7 (not 0.6). A JD is many sentences long, so
 *      0.6 would collapse genuinely distinct variants.
 */

/** Same fingerprint as the question variation logic. Exported for tests. */
export function fingerprint(text: string): string[] {
  return [...new Set((text.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? []).sort())];
}

function jdText(jd: JobDescription): string {
  return [
    jd.role,
    ...jd.responsibilities,
    ...jd.requiredSkills,
    ...jd.niceToHave,
    ...jd.interviewFocusAreas,
  ].join(" ");
}

export function isNearDuplicate(a: string[], b: string[], threshold: number): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const shared = a.filter((t) => b.includes(t)).length;
  return shared / Math.min(a.length, b.length) >= threshold;
}

/** More detail wins a duplicate pair: longer prose + more focus areas. */
export function detailScore(jd: JobDescription): number {
  return (
    jd.responsibilities.join(" ").length +
    jd.requiredSkills.join(" ").length +
    jd.niceToHave.join(" ").length +
    jd.interviewFocusAreas.length * 10
  );
}

export interface DedupeResult {
  kept: JobDescription[];
  removed: JobDescription[];
  /** One human-readable line per removal, for the report. */
  removalLog: string[];
}

export function dedupeJobDescriptions(
  input: JobDescription[],
  threshold = 0.7
): DedupeResult {
  const kept: JobDescription[] = [];
  const removed: JobDescription[] = [];
  const removalLog: string[] = [];
  const byBucket = new Map<string, Array<{ jd: JobDescription; fp: string[] }>>();

  let index = 0;
  for (const jd of input) {
    index += 1;
    const key = `${jd.role}|${jd.seniority}|${jd.companyType}`;
    const fp = fingerprint(jdText(jd));
    const bucket = byBucket.get(key) ?? [];
    const clash = bucket.find((prev) => isNearDuplicate(prev.fp, fp, threshold));

    if (!clash) {
      bucket.push({ jd, fp });
      byBucket.set(key, bucket);
      kept.push(jd);
      continue;
    }

    // Keep the more detailed of the pair; drop the other.
    if (detailScore(jd) > detailScore(clash.jd)) {
      const keepIdx = kept.indexOf(clash.jd);
      if (keepIdx >= 0) kept[keepIdx] = jd;
      removed.push(clash.jd);
      removalLog.push(`#${index} ${key}: replaced by a more detailed near-duplicate`);
      clash.jd = jd;
      clash.fp = fp;
    } else {
      removed.push(jd);
      removalLog.push(`#${index} ${key}: removed (near-duplicate of an existing variant)`);
    }
  }

  return { kept, removed, removalLog };
}
