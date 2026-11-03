import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildInterviewerUserPrompt } from "../src/lib/ai/prompts";
import type { InterviewerContext } from "../src/lib/ai/types";

/**
 * The live interviewer is instructed to adapt difficulty, but the request used
 * to carry no signal about how the last answer actually went, so the rule had
 * nothing to act on. The prompt now tells the model which direction to move.
 */

const base: InterviewerContext = {
  role: "Backend Engineer",
  seniority: "1–3 years",
  questionsAsked: 2,
  maxQuestions: 8,
  questionBank: [],
  history: [],
};

const longAnswer = [
  "The service was dropping about two percent of writes under load.",
  "First I reproduced it with a load test, then I traced the retries.",
  "The queue had no idempotency key, so duplicates amplified traffic.",
  "I added a dedupe table and the error rate fell to under one in ten thousand.",
  "The trade-off was extra write latency, which we accepted.",
  "I would make the same call again with that team.",
].join(" ");

describe("interviewer prompt: last-answer depth signal", () => {
  it("tells the interviewer to simplify after a thin answer", () => {
    const prompt = buildInterviewerUserPrompt({
      ...base,
      history: [
        { speaker: "AI", text: "Tell me about a migration you led." },
        { speaker: "CANDIDATE", text: "It went fine, I think." },
      ],
    });
    assert.match(prompt, /Last answer signal: thin/);
    assert.match(prompt, /Do NOT escalate difficulty/);
    assert.doesNotMatch(prompt, /signal: detailed/);
  });

  it("invites a deeper probe after a detailed answer", () => {
    const prompt = buildInterviewerUserPrompt({
      ...base,
      history: [
        { speaker: "AI", text: "Tell me about a production issue you fixed." },
        { speaker: "CANDIDATE", text: longAnswer },
      ],
    });
    assert.match(prompt, /Last answer signal: detailed/);
    assert.match(prompt, /one level deeper/);
    assert.doesNotMatch(prompt, /Do NOT escalate difficulty/);
  });

  it("adds no signal before the candidate has answered", () => {
    const prompt = buildInterviewerUserPrompt({
      ...base,
      history: [{ speaker: "AI", text: "Walk me through your background." }],
    });
    assert.doesNotMatch(prompt, /Last answer signal/);
  });
});
