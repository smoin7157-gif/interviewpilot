import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clampDebriefToTranscript } from "../src/lib/ai/debrief-grounding";
import type { DebriefContext, DebriefResult } from "../src/lib/ai/types";

const baseResult: DebriefResult = {
  overallScore: 70,
  breakdown: [
    {
      dimension: "technical",
      score: 70,
      note: "Solid depth",
      evidence: "We reduced API latency by forty percent using caching.",
    },
    {
      dimension: "communication",
      score: 68,
      evidence: "The candidate negotiated an offer at a FAANG company.",
    },
    {
      dimension: "structure",
      score: 72,
    },
    {
      dimension: "relevance",
      score: 71,
    },
    {
      dimension: "project_knowledge",
      score: 69,
    },
    {
      dimension: "problem_solving",
      score: 70,
    },
  ],
  strengths: [],
  weaknesses: [],
  missedOpportunities: [],
  strongestAnswer: { question: "Q1", why: "Clear structure." },
  weakestAnswer: { question: "Q2", why: "Thin on metrics." },
  recommendedPractice: [],
  provider: "fallback",
};

describe("clampDebriefToTranscript", () => {
  it("keeps evidence grounded in what the candidate actually said", () => {
    const ctx: DebriefContext = {
      role: "Backend Engineer",
      seniority: "3–5 years",
      maxQuestions: 5,
      transcript: [
        {
          speaker: "CANDIDATE",
          text: "We reduced API latency by forty percent using caching.",
        },
      ],
    };
    const out = clampDebriefToTranscript(baseResult, ctx);
    assert.ok(out.breakdown[0].evidence?.includes("latency"));
    assert.equal(out.breakdown[1].evidence, undefined);
  });
});