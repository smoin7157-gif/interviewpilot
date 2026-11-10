import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ATTEMPTS_PER_QUESTION, groupAttemptsByQuestion } from "../src/lib/attempt-history";

function attempt(questionId: string, score: number) {
  return { questionId, score };
}

describe("groupAttemptsByQuestion", () => {
  it("groups by question and keeps the newest-first order", () => {
    const grouped = groupAttemptsByQuestion([
      attempt("q1", 90),
      attempt("q1", 80),
      attempt("q2", 70),
      attempt("q1", 60),
    ]);
    assert.deepEqual(grouped.get("q1")?.map((a) => a.score), [90, 80, 60]);
    assert.deepEqual(grouped.get("q2")?.map((a) => a.score), [70]);
  });

  it("caps each question at five attempts by default", () => {
    const rows = Array.from({ length: 9 }, (_, i) => attempt("q1", 100 - i));
    const grouped = groupAttemptsByQuestion(rows);
    assert.equal(grouped.get("q1")?.length, ATTEMPTS_PER_QUESTION);
    assert.equal(grouped.get("q1")?.[0].score, 100, "newest attempt stays first");
  });

  it("honors a custom per-question cap and skips empty input", () => {
    const grouped = groupAttemptsByQuestion([attempt("q1", 1), attempt("q1", 2)], 1);
    assert.deepEqual(grouped.get("q1")?.map((a) => a.score), [1]);
    assert.equal(groupAttemptsByQuestion([]).size, 0);
  });
});
