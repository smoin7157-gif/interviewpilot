import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { summarizeMockProgress } from "../src/lib/mock";

/**
 * Progress of an in-progress mock session.
 *
 * The "is there an active mock?" lookup used to load only the first four turns
 * and derive the count from them, so a session reported "1 of 10" no matter how
 * long it had been running. These tests pin the derivation to the whole
 * transcript, whatever its length.
 */

type Turn = Parameters<typeof summarizeMockProgress>[0][number];

function turn(overrides: Partial<Turn> & Pick<Turn, "speaker" | "transcript">): Turn {
  return { action: null, category: null, difficulty: null, ...overrides };
}

function question(text: string): Turn {
  return turn({ speaker: "AI", transcript: text, action: "ask_question", category: "technical", difficulty: "medium" });
}

function answer(text: string): Turn {
  return turn({ speaker: "CANDIDATE", transcript: text });
}

describe("summarizeMockProgress", () => {
  it("counts main questions only — not follow-ups or candidate answers", () => {
    const progress = summarizeMockProgress([
      question("Walk me through your background."),
      answer("I've spent four years on backend services."),
      turn({ speaker: "AI", transcript: "Why did you choose Go?", action: "ask_followup" }),
      answer("Because of its concurrency model."),
      turn({ speaker: "AI", transcript: "Let's talk about indexing.", action: "move_topic", category: "technical", difficulty: "hard" }),
      answer("Sure."),
    ]);

    assert.equal(progress.questionsAsked, 2);
    assert.equal(progress.lastQuestion?.text, "Let's talk about indexing.");
    assert.equal(progress.lastQuestion?.difficulty, "hard");
  });

  it("sees the whole transcript, not just the opening turns", () => {
    const turns: Turn[] = [];
    for (let i = 1; i <= 6; i++) {
      turns.push(question(`Question ${i}?`), answer(`Answer ${i}.`));
    }

    const progress = summarizeMockProgress(turns);
    assert.equal(progress.questionsAsked, 6);
    assert.equal(progress.lastQuestion?.text, "Question 6?");
  });

  it("reports no question before the interviewer has spoken", () => {
    const progress = summarizeMockProgress([]);
    assert.equal(progress.questionsAsked, 0);
    assert.equal(progress.lastQuestion, null);
  });

  it("replays the last AI line even when it ended the session", () => {
    const progress = summarizeMockProgress([
      question("Explain REST."),
      answer("It's an architectural style..."),
      turn({ speaker: "AI", transcript: "That's all the questions I have for today.", action: "end_interview" }),
    ]);
    assert.equal(progress.questionsAsked, 1);
    assert.equal(progress.lastQuestion?.text, "That's all the questions I have for today.");
  });
});
