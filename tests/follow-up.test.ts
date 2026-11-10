import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FallbackProvider } from "../src/lib/ai/fallback";
import { answerFollowUpSchema } from "../src/lib/validation";

const provider = new FallbackProvider();

describe("answerFollowUpSchema", () => {
  it("accepts a real answer and trims surrounding whitespace", () => {
    const parsed = answerFollowUpSchema.safeParse({
      answer: "  I profiled the endpoint, cached the hot reads in Redis, and re-measured p95.  ",
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.answer.startsWith("I profiled"), true);
      assert.equal(parsed.data.answer.endsWith("p95."), true);
    }
  });

  it("rejects empty or short answers", () => {
    assert.equal(answerFollowUpSchema.safeParse({ answer: "" }).success, false);
    assert.equal(answerFollowUpSchema.safeParse({ answer: "Nope." }).success, false);
  });

  it("caps the answer at the same 10k limit as evaluation", () => {
    assert.equal(answerFollowUpSchema.safeParse({ answer: "x".repeat(10_001) }).success, false);
  });
});

describe("FallbackProvider.generateFollowUps (answer-reactive)", () => {
  it("references the candidate's own answer instead of a generic pool", async () => {
    const followUps = await provider.generateFollowUps({
      question: "How do you approach caching?",
      role: "Backend Engineer",
      seniority: "1–3 years",
      answer:
        "For caching I profile first, then cache the hot reads in Redis and measure p95 latency after each change.",
    });
    assert.ok(followUps.length >= 1 && followUps.length <= 3);
    assert.match(followUps[0], /Redis|profile first|p95/i);
  });

  it("probes for the missing basics when the answer is too thin to have depth", async () => {
    const followUps = await provider.generateFollowUps({
      question: "How do you approach caching?",
      role: "Backend Engineer",
      seniority: "1–3 years",
      answer: "Yes.",
    });
    assert.match(followUps[0], /specific situation|personally do/i);
  });
});
