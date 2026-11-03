import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { debriefOverallScore, parseDebrief } from "../src/lib/ai/validate";
import { FallbackProvider } from "../src/lib/ai/fallback";
import type { DebriefDimension } from "../src/lib/ai/types";

/**
 * The overall debrief score must be the weighted average of the six dimension
 * scores. When the model's headline number was stored as-is it could disagree
 * with the breakdown shown right beside it, which made the history trend
 * meaningless.
 */

const breakdown: Array<{
  dimension: DebriefDimension;
  score: number;
  note: string;
  evidence: string;
}> = [
  { dimension: "technical", score: 60, note: "Solid basics.", evidence: "\"I added an index on the email column\"" },
  { dimension: "communication", score: 80, note: "Clear delivery.", evidence: "\"First I measured, then I changed one thing\"" },
  { dimension: "structure", score: 70, note: "Mostly ordered.", evidence: "\"First ... then ... finally\"" },
  { dimension: "relevance", score: 90, note: "Answered the question.", evidence: "\"An index makes lookups faster\"" },
  { dimension: "project_knowledge", score: 50, note: "Thin on trade-offs.", evidence: "\"It was just the obvious choice\"" },
  { dimension: "problem_solving", score: 40, note: "No alternatives weighed.", evidence: "\"I did not compare options\"" },
];

const debriefJson = (overallScore: unknown) =>
  JSON.stringify({
    overallScore,
    breakdown,
    strengths: ["Named a concrete metric"],
    weaknesses: ["Did not discuss trade-offs"],
    missedOpportunities: ["Could have described alternatives"],
    strongestAnswer: { question: "Explain indexing.", why: "Concrete and direct." },
    weakestAnswer: { question: "How do you pick a data model?", why: "No reasoning shown." },
    recommendedPractice: ["Close each answer with the measured outcome"],
  });

describe("debriefOverallScore", () => {
  it("weights the dimensions as documented", () => {
    // .2*60 + .2*80 + .15*70 + .2*90 + .15*50 + .1*40 = 68
    assert.equal(debriefOverallScore(breakdown), 68);
  });

  it("clamps a breakdown to 0–100", () => {
    assert.equal(debriefOverallScore([{ dimension: "technical", score: 500 }]), 100);
    assert.equal(debriefOverallScore([{ dimension: "technical", score: -20 }]), 0);
  });
});

describe("parseDebrief", () => {
  it("replaces a headline that contradicts the breakdown", () => {
    const parsed = parseDebrief(debriefJson(99));
    assert.equal(parsed.overallScore, 68);
  });

  it("produces the same headline when the model already agreed", () => {
    const parsed = parseDebrief(debriefJson(68));
    assert.equal(parsed.overallScore, 68);
  });

  it("still rejects a non-numeric headline", () => {
    assert.throws(() => parseDebrief(debriefJson("great")), /non-numeric overall score/);
  });
});

describe("fallback debrief consistency", () => {
  it("reports an overall score equal to its own weighted breakdown", async () => {
    const result = await new FallbackProvider().generateDebrief({
      role: "Backend Engineer",
      seniority: "1–3 years",
      maxQuestions: 5,
      transcript: [
        {
          speaker: "AI",
          text: "Explain database indexing.",
          action: "ask_question",
          category: "technical",
          difficulty: "medium",
        },
        {
          speaker: "CANDIDATE",
          text: "An index is a lookup structure. First, I check the query pattern. For example, in my last project the result was a drop from seconds to milliseconds.",
        },
      ],
    });
    assert.equal(result.overallScore, debriefOverallScore(result.breakdown));
  });
});
