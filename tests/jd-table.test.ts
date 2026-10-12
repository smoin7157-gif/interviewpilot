import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { jobDescriptionSchema, type JobDescription } from "../src/lib/jd/schema";
import { buildLoadPlan, toTemplateRow, yearsForSeniority } from "../src/lib/jd/load";

/**
 * Guards for the `job_description_templates` load plan (Phase 6).
 *
 * The loader's mapping is pure, so these tests pin it offline: the committed
 * dataset must load completely (every entry valid, no silent drops), the
 * variant indexes must be unique per combo so the table's unique constraint
 * holds, and malformed entries must be rejected with their index — never
 * turned into rows.
 */

const dataset = JSON.parse(
  readFileSync(path.join(process.cwd(), "prisma", "seed-data", "job-descriptions.json"), "utf8")
) as JobDescription[];

describe("JD → job_description_templates load plan", () => {
  const plan = buildLoadPlan(dataset);

  it("accepts every committed dataset entry", () => {
    assert.equal(plan.rejected.length, 0, JSON.stringify(plan.rejected.slice(0, 5)));
    assert.equal(plan.rows.length, dataset.length);
  });

  it("produces unique (role, seniority, companyType, variantIndex) keys", () => {
    const keys = new Set<string>();
    for (const row of plan.rows) {
      const key = `${row.role}|${row.seniority}|${row.companyType}|${row.variantIndex}`;
      assert.equal(keys.has(key), false, `duplicate key ${key}`);
      keys.add(key);
    }
    assert.equal(keys.size, plan.rows.length);
  });

  it("assigns variant indexes densely from 0, in dataset order", () => {
    const firstIndexPerCombo = new Map<string, number[]>();
    dataset.forEach((jd, i) => {
      const combo = `${jd.role}|${jd.seniority}|${jd.companyType}`;
      const row = plan.rows[i];
      assert.equal(row.role, jd.role);
      assert.equal(row.seniority, jd.seniority);
      assert.equal(row.companyType, jd.companyType);
      const list = firstIndexPerCombo.get(combo) ?? [];
      list.push(row.variantIndex);
      firstIndexPerCombo.set(combo, list);
    });
    for (const [combo, indexes] of firstIndexPerCombo) {
      assert.deepEqual(
        indexes,
        indexes.map((_, j) => j),
        `variant indexes for ${combo} are not dense from 0`
      );
    }
  });

  it("keeps yearsExperience in agreement with seniority in every row", () => {
    for (const row of plan.rows) {
      assert.equal(row.yearsExperience, yearsForSeniority(row.seniority));
    }
  });

  it("round-trips each row back through the shared schema", () => {
    for (const row of plan.rows) {
      const jd = {
        role: row.role,
        seniority: row.seniority,
        companyType: row.companyType,
        yearsExperience: row.yearsExperience,
        responsibilities: row.responsibilities,
        requiredSkills: row.requiredSkills,
        niceToHave: row.niceToHave,
        interviewFocusAreas: row.interviewFocusAreas,
      };
      const parsed = jobDescriptionSchema.safeParse(jd);
      assert.equal(parsed.success, true, `row failed schema: ${JSON.stringify(jd).slice(0, 160)}`);
    }
  });
});

describe("buildLoadPlan rejection handling", () => {
  it("rejects malformed entries with their index and never turns them into rows", () => {
    const good: JobDescription = dataset[0];
    const plan = buildLoadPlan([
      good,
      { role: "X" }, // missing everything
      { ...good, seniority: "principal" }, // not a seed seniority
      { ...good, yearsExperience: "6+" }, // disagrees with its seniority
    ]);
    assert.equal(plan.rows.length, 1);
    assert.equal(plan.rejected.length, 3);
    assert.deepEqual(
      plan.rejected.map((r) => r.index),
      [1, 2, 3]
    );
    for (const r of plan.rejected) assert.ok(r.reason.length > 0);
  });

  it("toTemplateRow carries every dataset field through unchanged", () => {
    const jd = dataset[0];
    const row = toTemplateRow(jd, 4);
    assert.equal(row.variantIndex, 4);
    assert.deepEqual(row.responsibilities, jd.responsibilities);
    assert.deepEqual(row.requiredSkills, jd.requiredSkills);
    assert.deepEqual(row.niceToHave, jd.niceToHave);
    assert.deepEqual(row.interviewFocusAreas, jd.interviewFocusAreas);
  });
});
