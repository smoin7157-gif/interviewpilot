import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  findJdRefs,
  toSeedCompanyType,
  toSeedSeniority,
} from "../src/lib/jd/index";
import { ROLE_CATALOG } from "../src/lib/jd/roles";
import { SENIORITIES } from "../src/lib/jd/schema";

/**
 * Guards for the compact JD index the offline fallback reads
 * (`src/lib/jd/index.ts`). These run against the committed seed dataset, so
 * they fail if the index stops resolving roles or quietly degrades to empty.
 */

describe("toSeedSeniority", () => {
  it("maps every InterviewOS experience level", () => {
    assert.equal(toSeedSeniority("Fresher"), "entry");
    assert.equal(toSeedSeniority("0–1 years"), "entry");
    assert.equal(toSeedSeniority("1–3 years"), "mid");
    assert.equal(toSeedSeniority("3–5 years"), "mid");
    assert.equal(toSeedSeniority("5+ years"), "senior");
  });

  it("accepts common spellings and rejects unknowns", () => {
    assert.equal(toSeedSeniority("Senior"), "senior");
    assert.equal(toSeedSeniority("mid-level"), "mid");
    assert.equal(toSeedSeniority("5+ years"), "senior");
    assert.equal(toSeedSeniority("principal"), "senior");
    assert.equal(toSeedSeniority("wizard"), null);
    assert.equal(toSeedSeniority(""), null);
  });
});

describe("toSeedCompanyType", () => {
  it("maps the product company vocabulary onto seed categories", () => {
    assert.equal(toSeedCompanyType("Startup"), "startup");
    assert.equal(toSeedCompanyType("MNC"), "enterprise");
    assert.equal(toSeedCompanyType("Consulting"), "enterprise");
    assert.equal(toSeedCompanyType("Product Company"), "mid-size");
    assert.equal(toSeedCompanyType("Service Company"), "mid-size");
    assert.equal(toSeedCompanyType("Other"), null);
    assert.equal(toSeedCompanyType(undefined), null);
  });
});

describe("findJdRefs", () => {
  it("resolves an exact catalog role and returns seed variants", () => {
    const refs = findJdRefs("Backend Engineer", "3–5 years");
    assert.ok(refs.length >= 3, `expected seed variants, got ${refs.length}`);
    for (const ref of refs) {
      assert.equal(ref.role, "Backend Engineer");
      assert.equal(ref.seniority, "mid");
      assert.ok(ref.requiredSkills.length >= 3);
      assert.ok(ref.responsibilities.length >= 3);
      assert.ok(ref.interviewFocusAreas.length >= 2);
    }
  });

  it("fuzzy-resolves a decorated role title", () => {
    const refs = findJdRefs("Senior Backend Engineer", "5+ years");
    assert.ok(refs.length >= 3);
    for (const ref of refs) {
      assert.equal(ref.role, "Backend Engineer");
      assert.equal(ref.seniority, "senior");
    }
  });

  it("narrows by company type when the app value maps to a seed category", () => {
    const refs = findJdRefs("Frontend Engineer", "1–3 years", "Startup");
    assert.ok(refs.length >= 1);
    assert.ok(refs.every((ref) => ref.companyType === "startup"));
  });

  it("returns nothing for an unknown role or experience level", () => {
    assert.deepEqual(findJdRefs("Astronaut", "3–5 years"), []);
    assert.deepEqual(findJdRefs("Backend Engineer", "wizard"), []);
  });

  it("covers every catalog role at every seniority", () => {
    for (const spec of ROLE_CATALOG) {
      for (const seniority of SENIORITIES) {
        const appSeniority =
          seniority === "entry" ? "0–1 years" : seniority === "mid" ? "3–5 years" : "5+ years";
        const refs = findJdRefs(spec.label, appSeniority);
        assert.ok(refs.length >= 3, `${spec.label}/${seniority}: only ${refs.length} refs`);
        assert.ok(refs.every((ref) => ref.role === spec.label));
      }
    }
  });

  it("reuses one cached index across calls", () => {
    const a = findJdRefs("Backend Engineer", "1–3 years");
    const b = findJdRefs("Backend Engineer", "1–3 years");
    assert.equal(a, b, "lookups should return the cached arrays, not rebuild the index");
  });
});
