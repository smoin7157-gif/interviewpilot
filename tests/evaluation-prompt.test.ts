import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildEvaluationUserPrompt, EVALUATION_SYSTEM_PROMPT } from "../src/lib/ai/prompts";

/**
 * Scoring must be relative to the target experience level. Judging a Fresher
 * answer by a 5+ years bar (or the reverse) makes the score meaningless, so
 * the level has to reach the model and the prompt has to say what it means.
 */
describe("evaluation prompt: experience-level calibration", () => {
  it("states the level and the bar it implies", () => {
    const prompt = buildEvaluationUserPrompt({
      prompt: "Explain database indexing and when you would add one.",
      answer: "An index makes lookups faster. I added one on the email column at work.",
      role: "Backend Engineer",
      seniority: "Fresher",
    });
    assert.match(prompt, /Experience level: Fresher/);
    assert.match(prompt, /Fresher bar/);
  });

  it("omits level language when no level is supplied", () => {
    const prompt = buildEvaluationUserPrompt({
      prompt: "Explain database indexing and when you would add one.",
      answer: "An index makes lookups faster.",
      role: "Backend Engineer",
    });
    assert.doesNotMatch(prompt, /Experience level/);
    assert.doesNotMatch(prompt, /undefined/);
  });

  it("keeps the level-calibration rule in the system prompt", () => {
    assert.match(EVALUATION_SYSTEM_PROMPT, /target experience level/i);
    assert.match(EVALUATION_SYSTEM_PROMPT, /never inflate/i);
  });
});
