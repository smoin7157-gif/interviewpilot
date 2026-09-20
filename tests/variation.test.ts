import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filterAvoidList, parseQuestions } from "../src/lib/ai/validate";
import { FallbackProvider } from "../src/lib/ai/fallback";
import type { GenerationContext } from "../src/lib/ai/types";

const questionJson = (questions: unknown[]) =>
  JSON.stringify({ interview: { title: "t", questions } });

const baseQuestion = {
  category: "technical",
  difficulty: "medium",
  reason: "Checks core knowledge for the role.",
  source_context: ["resume"],
  suggested_answer: "A reasonably long suggested answer used for validation purposes only.",
  follow_up_questions: ["Follow-up one?", "Follow-up two?", "Follow-up three?"],
};

const ctx: GenerationContext = {
  role: "Frontend Engineer",
  seniority: "1–3 years",
  count: 5,
};

describe("filterAvoidList", () => {
  it("drops questions that rephrase something already practiced", () => {
    const questions = [
      { question: "How does the JavaScript event loop handle async callbacks?" },
      { question: "Explain database indexing and when you would add one." },
    ];
    const filtered = filterAvoidList(questions, [
      "Can you explain how the JavaScript event loop handles async callbacks?",
    ]);
    assert.equal(filtered.length, 1);
    assert.match(filtered[0].question, /indexing/);
  });

  it("keeps everything when the avoid list is empty", () => {
    const questions = [{ question: "What is a database index?" }];
    assert.equal(filterAvoidList(questions, []).length, 1);
  });
});

describe("parseQuestions with avoid list", () => {
  it("filters avoided questions after validation", () => {
    const raw = questionJson([
      { ...baseQuestion, question: "Walk me through how you would design a rate limiter for an API." },
      { ...baseQuestion, question: "Describe your approach to debugging a slow database query." },
    ]);
    const parsed = parseQuestions(raw, [
      "How would you design a rate limiter for a public API?",
    ]);
    assert.equal(parsed.length, 1);
    assert.match(parsed[0].question, /database/);
  });
});

describe("fallback provider variation", () => {
  it("skips avoided templates and serves fresh questions", async () => {
    const provider = new FallbackProvider();
    const first = await provider.generateQuestions(ctx);
    assert.equal(first.length, 5);

    const second = await provider.generateQuestions({
      ...ctx,
      avoidQuestions: first.map((q) => q.question),
    });
    const firstSet = new Set(first.map((q) => q.question));
    const overlap = second.filter((q) => firstSet.has(q.question));
    // The bank has far more than 5 templates, so a repeat session should be
    // able to serve a fully fresh set.
    assert.equal(overlap.length, 0);
    assert.equal(second.length, 5);
  });

  it("still returns a full set when the avoid list exceeds the bank", async () => {
    const provider = new FallbackProvider();
    const exhaustiveAvoid = Array.from({ length: 500 }, (_, i) => `avoid ${i}`);
    const result = await provider.generateQuestions({ ...ctx, avoidQuestions: exhaustiveAvoid });
    // Exhausted pool relaxes the filter rather than under-delivering.
    assert.equal(result.length, 5);
  });
});

describe("two back-to-back sessions for the same profile", () => {
  /**
   * Simulates what the generate route does across repeat sessions: session 1
   * generates normally; session 2 for the SAME role/seniority/company receives
   * session 1's questions as the avoid-list (the route passes the user's last
   * 200 generated questions). The assertion uses the production dedupe oracle
   * (filterAvoidList — token-overlap fingerprints) over session 2's output, so
   * "drops near-duplicates" is proven, not merely that exact strings differ.
   */
  it("session 2 contains zero near-duplicates of session 1", async () => {
    const provider = new FallbackProvider();
    const profile = {
      role: "Full-Stack Developer",
      seniority: "3–5 years",
      company: "Acme",
      count: 10,
    };

    const session1 = await provider.generateQuestions(profile);
    assert.equal(session1.length, 10);

    const session2 = await provider.generateQuestions({
      ...profile,
      avoidQuestions: session1.map((q) => q.question),
    });
    // Full delivery — avoiding practiced questions must not shrink the set.
    assert.equal(session2.length, 10);

    // Run the production dedupe over session 2 against session 1: if any
    // near-duplicate rephrase survived, survivors.length would be < 10.
    const survivors = filterAvoidList(session2, session1.map((q) => q.question));
    assert.equal(survivors.length, session2.length);
  });
});
