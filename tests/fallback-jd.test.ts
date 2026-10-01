import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FallbackProvider } from "../src/lib/ai/fallback";
import { findJdRefs } from "../src/lib/jd";

/**
 * Behavioural guard for JD grounding in the offline provider: when a seed job
 * description matches the requested role, fallback questions must name that
 * role's real stack, the seniority difficulty mix must survive the rewrite, and
 * repeat sessions must still serve fresh questions.
 */

const provider = new FallbackProvider();

describe("FallbackProvider JD grounding", () => {
  it("references the seed JD's real skills for a matched role", async () => {
    const refs = findJdRefs("Backend Engineer", "3–5 years");
    const skills = [...new Set(refs.flatMap((r) => r.requiredSkills.map((s) => s.toLowerCase())))];
    assert.ok(skills.length >= 3, "expected a seed JD with skills to ground against");

    const questions = await provider.generateQuestions({
      role: "Backend Engineer",
      seniority: "3–5 years",
      count: 10,
    });
    assert.equal(questions.length, 10);

    const grounded = questions.filter((q) => {
      const text = q.question.toLowerCase();
      return skills.some((skill) => text.includes(skill));
    });
    assert.ok(grounded.length >= 2, `expected JD-grounded questions, got ${grounded.length}`);
  });

  it("keeps the seniority difficulty mix while grounded", async () => {
    const fresher = await provider.generateQuestions({ role: "Backend Engineer", seniority: "Fresher", count: 8 });
    const senior = await provider.generateQuestions({ role: "Backend Engineer", seniority: "5+ years", count: 8 });
    assert.ok(
      fresher.filter((q) => q.difficulty === "easy").length >= 4,
      "grounding must not change the Fresher difficulty mix"
    );
    assert.ok(
      senior.filter((q) => q.difficulty === "hard").length >= 3,
      "grounding must not change the senior difficulty mix"
    );
  });

  it("serves fresh questions across repeat sessions for the same grounded role", async () => {
    const profile = { role: "Frontend Engineer", seniority: "1–3 years", company: "Acme", count: 10 };
    const first = await provider.generateQuestions(profile);
    assert.equal(first.length, 10);

    const second = await provider.generateQuestions({
      ...profile,
      avoidQuestions: first.map((q) => q.question),
    });
    const firstSet = new Set(first.map((q) => q.question));
    assert.equal(second.length, 10);
    assert.equal(second.filter((q) => firstSet.has(q.question)).length, 0);
  });

  it("leaves an unmatched role on the generic template bank", async () => {
    const questions = await provider.generateQuestions({ role: "Astronaut", seniority: "3–5 years", count: 5 });
    assert.equal(questions.length, 5);
    assert.ok(questions.every((q) => q.suggested_answer.length > 0 && q.follow_up_questions.length > 0));
  });
});
