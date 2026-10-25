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

  it("asks about the candidate's own stack, never the seed variant's", async () => {
    // Regression: a Node/Postgres/TypeScript posting for "Backend Engineer"
    // used to be answered with Java and Python questions, because grounding
    // read the seed variant's requiredSkills and ignored the pasted posting.
    const questions = await provider.generateQuestions({
      role: "Backend Engineer",
      seniority: "3–5 years",
      companyType: "Startup",
      interviewType: "Technical",
      jobDescription:
        "Build APIs with Node, Postgres and TypeScript. Own reliability and on-call for the services you ship.",
      count: 10,
    });

    assert.equal(questions.length, 10);
    const text = questions.map((q) => q.question.toLowerCase()).join(" ");
    assert.equal(/\b(java|python)\b/.test(text), false, `seed-only technologies leaked in:\n${text}`);
    assert.match(text, /node|postgres|typescript/, "expected the pasted stack to be asked about");
    assert.match(text, /apis|on-call/, "expected the posting's duties to be asked about");
  });

  it("does not anchor the whole set on one duty from the posting", async () => {
    const questions = await provider.generateQuestions({
      role: "Backend Engineer",
      seniority: "3–5 years",
      interviewType: "Technical",
      jobDescription:
        "Build APIs with Node, Postgres and TypeScript. Own reliability and on-call for the services you ship.",
      count: 10,
    });
    const asking = (needle: string) =>
      questions.filter((q) => q.question.toLowerCase().includes(needle)).length;

    assert.ok(asking("build apis") >= 1, "the posting's first duty should be asked about");
    assert.ok(asking("build apis") <= 2, `one duty anchored ${asking("build apis")} questions`);
    assert.ok(asking("on-call") <= 2, `one duty anchored ${asking("on-call")} questions`);
  });

  it("still grounds a role outside the catalog when the posting names a stack", async () => {
    const questions = await provider.generateQuestions({
      role: "Staff Platform Engineer II",
      seniority: "5+ years",
      jobDescription: "Run our Kubernetes platform and own incident response.",
      count: 6,
    });
    const text = questions.map((q) => q.question.toLowerCase()).join(" ");
    assert.match(text, /kubernetes/, "a pasted stack should ground even an off-catalog role title");
  });

  it("keeps the seed grounding when no job description is pasted", async () => {
    const questions = await provider.generateQuestions({
      role: "Backend Engineer",
      seniority: "3–5 years",
      count: 8,
    });
    const text = questions.map((q) => q.question.toLowerCase()).join(" ");
    assert.match(text, /java|python|go|postgres/, "seed grounding should still apply");
  });

  it("leaves an unmatched role on the generic template bank", async () => {
    const questions = await provider.generateQuestions({ role: "Astronaut", seniority: "3–5 years", count: 5 });
    assert.equal(questions.length, 5);
    assert.ok(questions.every((q) => q.suggested_answer.length > 0 && q.follow_up_questions.length > 0));
  });
});
