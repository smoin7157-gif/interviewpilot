import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateAnswerHeuristically } from "../src/lib/ai/evaluation-heuristic";

const ctx = {
  prompt: "Tell me about a time you improved reliability.",
  answer:
    "For example, I led an on-call improvement. First we mapped incidents. Then we added runbooks. " +
    "Finally we reduced pages. The outcome was fewer outages and improved MTTR.",
  role: "Backend Engineer",
  company: "Acme",
};

describe("evaluateAnswerHeuristically", () => {
  it("returns identical scores for identical inputs", () => {
    const a = evaluateAnswerHeuristically(ctx);
    const b = evaluateAnswerHeuristically(ctx);
    assert.equal(a.score, b.score);
    assert.deepEqual(a.strengths, b.strengths);
    assert.deepEqual(a.missing, b.missing);
    assert.deepEqual(a.improvements, b.improvements);
  });

  it("keeps scores within 0–100", () => {
    const thin = evaluateAnswerHeuristically({ ...ctx, answer: "Yes." });
    assert.ok(thin.score >= 0 && thin.score <= 100);
    const rich = evaluateAnswerHeuristically(ctx);
    assert.ok(rich.score >= 0 && rich.score <= 100);
    assert.ok(rich.score >= thin.score);
  });
});