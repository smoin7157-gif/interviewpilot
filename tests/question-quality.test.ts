import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isMultiPartQuestion, parseQuestions } from "../src/lib/ai/validate";

/**
 * The generation prompt already requires one idea per question, but nothing
 * enforced it: a stacked "…? And also …?" question then reached the workspace,
 * where it is impossible to answer aloud in one turn.
 */

const baseQuestion = {
  category: "technical",
  difficulty: "medium",
  reason: "Checks core knowledge for the role.",
  source_context: ["job_description"],
  suggested_answer: "A reasonably long suggested answer used for validation purposes only.",
  follow_up_questions: ["Follow-up one?", "Follow-up two?", "Follow-up three?"],
};

const questionJson = (questions: unknown[]) =>
  JSON.stringify({ interview: { title: "t", questions } });

describe("isMultiPartQuestion", () => {
  it("flags two direct asks", () => {
    assert.equal(
      isMultiPartQuestion(
        "What made you choose PostgreSQL here? And how would you migrate off it later?"
      ),
      true
    );
  });

  it("flags a second ask joined by 'and also'", () => {
    assert.equal(
      isMultiPartQuestion(
        "Walk me through your rollout plan and also explain how you would roll it back."
      ),
      true
    );
  });

  it("keeps a single question with a comparison clause", () => {
    assert.equal(
      isMultiPartQuestion(
        "Compare PostgreSQL and MongoDB for this workload — which would you pick, and why?"
      ),
      false
    );
  });

  it("keeps a normal one-ask question", () => {
    assert.equal(
      isMultiPartQuestion("Why did you add a composite index on tenant_id and created_at?"),
      false
    );
  });
});

describe("parseQuestions", () => {
  it("drops stacked questions and keeps the answerable ones", () => {
    const raw = questionJson([
      {
        ...baseQuestion,
        question: "How would you design the ingestion path? And how would you test it under load?",
      },
      {
        ...baseQuestion,
        question: "Describe how you cut p95 latency on a Node service by 40 percent.",
      },
    ]);
    const parsed = parseQuestions(raw);
    assert.equal(parsed.length, 1);
    assert.match(parsed[0].question, /p95 latency/);
  });
});
