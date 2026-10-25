import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mockHref,
  practiceHref,
  practiceSearch,
  resolvePracticePosition,
} from "../src/lib/practice-position";
import type { WorkspaceQuestion } from "../src/lib/types";

/**
 * Guards the workspace position rule.
 *
 * A wrong answer here is not cosmetic: it decides which question a resumed
 * session, a bookmarked link or a return from the spoken mock opens on, and an
 * index that is off by one shows the user someone else's place.
 */

type PositionQuestion = Pick<WorkspaceQuestion, "id" | "status" | "followUps">;

const questions: PositionQuestion[] = [
  { id: "q1", status: "PRACTICED", followUps: ["f1a", "f1b"] },
  { id: "q2", status: "NOT_STARTED", followUps: ["f2a"] },
  { id: "q3", status: "SKIPPED", followUps: [] },
];

describe("resolvePracticePosition", () => {
  it("opens on the first unpracticed question when no position is requested", () => {
    assert.deepEqual(resolvePracticePosition(questions), {
      mainIdx: 1,
      followUpIdx: 0,
      tab: "interview",
    });
  });

  it("opens on the URL's question, even when another one is unpracticed", () => {
    assert.deepEqual(resolvePracticePosition(questions, { q: "q3" }), {
      mainIdx: 2,
      followUpIdx: 0,
      tab: "interview",
    });
  });

  it("restores a follow-up position", () => {
    assert.deepEqual(resolvePracticePosition(questions, { q: "q1", f: "1" }), {
      mainIdx: 0,
      followUpIdx: 1,
      tab: "followup",
    });
  });

  it("ignores a follow-up index the question does not have", () => {
    assert.deepEqual(resolvePracticePosition(questions, { q: "q3", f: "2" }), {
      mainIdx: 2,
      followUpIdx: 0,
      tab: "interview",
    });
    assert.deepEqual(resolvePracticePosition(questions, { q: "q1", f: "nope" }), {
      mainIdx: 0,
      followUpIdx: 0,
      tab: "interview",
    });
  });

  it("falls back to the resume rule when the question no longer exists", () => {
    assert.deepEqual(resolvePracticePosition(questions, { q: "deleted", f: "1" }), {
      mainIdx: 1,
      followUpIdx: 0,
      tab: "interview",
    });
  });

  it("opens question 1 when every question has been practiced", () => {
    const done = questions.map((question) => ({ ...question, status: "PRACTICED" as const }));
    assert.equal(resolvePracticePosition(done).mainIdx, 0);
  });

  it("has no position for an empty set", () => {
    assert.deepEqual(resolvePracticePosition([]), {
      mainIdx: -1,
      followUpIdx: 0,
      tab: "interview",
    });
  });
});

describe("practiceSearch / practiceHref", () => {
  it("keeps the question id and, for a follow-up, its index", () => {
    assert.equal(practiceSearch("q2"), "?q=q2");
    assert.equal(practiceSearch("q1", 1), "?q=q1&f=1");
    assert.equal(practiceHref("s1", "q1", 0), "/interviews/s1?q=q1&f=0");
  });

  it("round-trips through the resolver", () => {
    const search = practiceSearch("q1", 1);
    const params = new URLSearchParams(search);
    const position = resolvePracticePosition(questions, {
      q: params.get("q") ?? undefined,
      f: params.get("f") ?? undefined,
    });
    assert.deepEqual(position, { mainIdx: 0, followUpIdx: 1, tab: "followup" });
  });

  it("has no search string without a question", () => {
    assert.equal(practiceSearch(undefined), "");
    assert.equal(practiceHref("s1"), "/interviews/s1");
  });
});

describe("mockHref", () => {
  it("carries the question into the mock so its back links return there", () => {
    assert.equal(mockHref("s1", "q2"), "/mock/s1?q=q2");
    assert.equal(mockHref("s1"), "/mock/s1");
  });

  it("agrees with practiceHref on the question id", () => {
    const intoMock = new URLSearchParams(mockHref("s1", "q2").split("?")[1]);
    const back = new URLSearchParams(practiceHref("s1", "q2").split("?")[1]);
    assert.equal(intoMock.get("q"), "q2");
    assert.equal(back.get("q"), intoMock.get("q"));
  });
});
