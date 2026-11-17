import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clampSuggestedAnswerToSource } from "../src/lib/ai/answer-grounding";

const JD = "Build APIs with Node.js and PostgreSQL at Acme Corp.";

describe("clampSuggestedAnswerToSource", () => {
  it("removes invented employer claims", () => {
    const raw =
      "At Google I led billing. " +
      "For example at Acme Corp I shipped Node.js APIs with PostgreSQL.";
  const clamped = clampSuggestedAnswerToSource(raw, JD);
    assert.doesNotMatch(clamped, /Google/);
    assert.match(clamped, /Acme|Node/i);
  });

  it("keeps STAR scaffolding with placeholders", () => {
    const raw = "The situation was [context], the outcome was [measurable result].";
    assert.match(clampSuggestedAnswerToSource(raw, JD), /\[context\]/);
  });
});