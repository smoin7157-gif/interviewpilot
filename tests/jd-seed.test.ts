import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  COMPANY_TYPES,
  jobDescriptionSchema,
  SENIORITIES,
  YEARS_BY_SENIORITY,
  type JobDescription,
} from "../src/lib/jd/schema";
import { ROLE_CATALOG } from "../src/lib/jd/roles";
import { dedupeJobDescriptions } from "../src/lib/jd/dedupe";
import { composeBatchLocal } from "../src/lib/jd/compose";

/**
 * Guards for the offline JD seed dataset (`prisma/seed-data/job-descriptions.json`)
 * and the deterministic composer that produces it.
 *
 * These are cheap, network-free checks: the committed file is the source of
 * truth for the dataset, so a regeneration that degrades coverage, drifts from
 * the schema, or reintroduces near-duplicate variants fails here rather than in
 * a review of a 1.6 MB JSON diff.
 */

const dataset = JSON.parse(
  readFileSync(path.join(process.cwd(), "prisma", "seed-data", "job-descriptions.json"), "utf8")
) as JobDescription[];

const bucketKey = (jd: Pick<JobDescription, "role" | "seniority" | "companyType">) =>
  `${jd.role}|${jd.seniority}|${jd.companyType}`;

describe("JD seed dataset", () => {
  it("holds 1000+ entries and every entry passes the schema", () => {
    assert.ok(dataset.length >= 1000, `only ${dataset.length} entries`);
    for (const jd of dataset) {
      const parsed = jobDescriptionSchema.safeParse(jd);
      assert.equal(parsed.success, true, `invalid entry: ${JSON.stringify(jd).slice(0, 160)}`);
    }
  });

  it("covers every role × seniority × company type combination", () => {
    const seen = new Set(dataset.map(bucketKey));
    const missing: string[] = [];
    for (const spec of ROLE_CATALOG) {
      for (const seniority of SENIORITIES) {
        for (const companyType of COMPANY_TYPES) {
          const key = `${spec.label}|${seniority}|${companyType}`;
          if (!seen.has(key)) missing.push(key);
        }
      }
    }
    assert.deepEqual(missing, []);
  });

  it("keeps at least three distinct variants in every combination", () => {
    const counts = new Map<string, number>();
    for (const jd of dataset) {
      const key = bucketKey(jd);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const thin = [...counts.entries()].filter(([, n]) => n < 3);
    assert.deepEqual(thin, [], `combinations with fewer than 3 variants: ${JSON.stringify(thin.slice(0, 5))}`);
  });

  it("always derives yearsExperience from seniority", () => {
    for (const jd of dataset) {
      assert.equal(jd.yearsExperience, YEARS_BY_SENIORITY[jd.seniority], `${jd.role}/${jd.seniority}`);
    }
  });

  it("is already deduped — re-running the pass removes nothing", () => {
    const { removed } = dedupeJobDescriptions(dataset, 0.7);
    assert.equal(removed.length, 0, `${removed.length} near-duplicates survived`);
  });

  it("names technologies, never soft skills, in requiredSkills", () => {
    const banned = /^(programming|coding|software( development)?|teamwork|team work|communication|problem[- ]?solving|hard work|leadership|english)$/i;
    for (const jd of dataset) {
      for (const skill of jd.requiredSkills) {
        assert.equal(banned.test(skill.trim()), false, `${jd.role}: ${skill}`);
      }
    }
  });
});

describe("offline JD composer", () => {
  it("composes schema-valid, mostly distinct variants for every catalog role", () => {
    for (const spec of ROLE_CATALOG) {
      const batch = composeBatchLocal(
        spec,
        { role: spec.label, seniority: "mid", companyType: "startup", yearsExperience: "3-5" },
        5
      );
      for (const jd of batch) {
        assert.equal(jobDescriptionSchema.safeParse(jd).success, true, `${spec.label} composed invalid output`);
      }
      const { kept } = dedupeJobDescriptions(batch, 0.7);
      assert.ok(kept.length >= 3, `${spec.label}: only ${kept.length}/5 variants survived dedupe`);
    }
  });

  it("changes tone and scope between seniority levels and company types", () => {
    const spec = ROLE_CATALOG[0];
    const at = (seniority: "entry" | "senior", companyType: "startup" | "enterprise") =>
      composeBatchLocal(spec, {
        role: spec.label,
        seniority,
        companyType,
        yearsExperience: YEARS_BY_SENIORITY[seniority],
      }, 1)[0];

    const entry = at("entry", "startup");
    const senior = at("senior", "enterprise");

    assert.notDeepEqual(entry.responsibilities, senior.responsibilities);
    assert.notEqual(entry.yearsExperience, senior.yearsExperience);
    // The enterprise entry carries the scale/process clause the startup one doesn't.
    const joined = senior.responsibilities.join(" ");
    assert.match(joined, /services|governance|on-call|audit|regions/);
  });

  it("keeps variant numbering continuous so a topped-up batch cannot duplicate itself", () => {
    const spec = ROLE_CATALOG[1];
    const fixed = { role: spec.label, seniority: "mid" as const, companyType: "mid-size" as const, yearsExperience: "3-5" as const };
    const first = composeBatchLocal(spec, fixed, 3);
    const second = composeBatchLocal(spec, fixed, 3, 3);
    const firstQuestions = new Set(first.map((jd) => JSON.stringify(jd)));
    for (const jd of second) {
      assert.equal(firstQuestions.has(JSON.stringify(jd)), false, "topped-up batch repeated an earlier variant");
    }
  });
});
