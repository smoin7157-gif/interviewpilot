import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseFollowUps, parseQuestions } from "../src/lib/ai/validate";

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

describe("parseQuestions", () => {
  it("passes through distinct questions unchanged", () => {
    const raw = questionJson([
      { ...baseQuestion, question: "How does the JavaScript event loop handle async callbacks?" },
      { ...baseQuestion, question: "Explain database indexing and when you would add one." },
    ]);
    const parsed = parseQuestions(raw);
    assert.equal(parsed.length, 2);
  });

  it("drops near-duplicate rephrases of the same question", () => {
    const raw = questionJson([
      { ...baseQuestion, question: "How does the JavaScript event loop handle async callbacks?" },
      { ...baseQuestion, question: "Can you explain how the JavaScript event loop handles async callbacks?" },
      { ...baseQuestion, question: "Explain database indexing and when you would add one." },
    ]);
    const parsed = parseQuestions(raw);
    assert.equal(parsed.length, 2);
    assert.match(parsed[0].question, /event loop/);
    assert.match(parsed[1].question, /indexing/);
  });

  it("normalizes source_context onto the documented vocabulary", () => {
    const raw = questionJson([
      {
        ...baseQuestion,
        question: "Walk me through your experience leading a migration project.",
        source_context: ["Resume / CV", "GITHUB REPO", "job description", "made-up-tag"],
      },
    ]);
    const parsed = parseQuestions(raw);
    assert.deepEqual(parsed[0].source_context, ["resume", "github", "job_description", "general"]);
  });

  it("filters unusable questions (too short) but keeps the valid rest", () => {
    const raw = questionJson([
      { ...baseQuestion, question: "Hmm?" },
      { ...baseQuestion, question: "Describe a time you had to say no to a stakeholder request." },
    ]);
    const parsed = parseQuestions(raw);
    assert.equal(parsed.length, 1);
    assert.match(parsed[0].question, /stakeholder/);
  });

  it("throws when nothing usable remains", () => {
    const raw = questionJson([{ ...baseQuestion, question: "Hi" }]);
    assert.throws(() => parseQuestions(raw), /no usable questions/);
  });
});

describe("parseFollowUps", () => {
  it("drops multi-part follow-ups that cannot be answered in one turn", () => {
    const raw = JSON.stringify({
      follow_up_questions: [
        "How would you size the cache?",
        "What trade-off did you choose? And how would you validate it?",
        "What metric proved it worked?",
      ],
    });
    const followUps = parseFollowUps(raw);
    assert.equal(followUps.length, 2);
    assert.doesNotMatch(followUps.join(" "), /And how would you validate/);
  });
});
