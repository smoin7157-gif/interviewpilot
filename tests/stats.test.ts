import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { currentStreak, dayKey, nextBestStep, streakFromDates } from "../src/lib/stats";

// A fixed local noon keeps the day arithmetic deterministic across timezones.
const NOW = new Date(2026, 0, 15, 12, 0, 0);

function daysAgo(n: number, hour = 10): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  d.setHours(hour);
  return d;
}

describe("dayKey", () => {
  it("formats a local date as YYYY-MM-DD with padding", () => {
    assert.equal(dayKey(new Date(2026, 0, 5)), "2026-01-05");
    assert.equal(dayKey(new Date(2026, 11, 31)), "2026-12-31");
  });

  it("treats same-day timestamps as the same key", () => {
    assert.equal(dayKey(new Date(2026, 0, 5, 1)), dayKey(new Date(2026, 0, 5, 23)));
  });
});

describe("currentStreak", () => {
  it("is 0 with no activity", () => {
    assert.equal(currentStreak(new Set(), NOW), 0);
  });

  it("counts a single practice today as one day", () => {
    assert.equal(currentStreak(new Set([dayKey(NOW)]), NOW), 1);
  });

  it("counts consecutive days ending today", () => {
    const keys = new Set([dayKey(daysAgo(0)), dayKey(daysAgo(1)), dayKey(daysAgo(2))]);
    assert.equal(currentStreak(keys, NOW), 3);
  });

  it("still counts a run that ended yesterday", () => {
    const keys = new Set([dayKey(daysAgo(1)), dayKey(daysAgo(2))]);
    assert.equal(currentStreak(keys, NOW), 2);
  });

  it("breaks when the most recent activity is older than yesterday", () => {
    const keys = new Set([dayKey(daysAgo(2)), dayKey(daysAgo(3))]);
    assert.equal(currentStreak(keys, NOW), 0);
  });

  it("stops at the first gap", () => {
    // today, yesterday, then a hole at two days ago
    const keys = new Set([dayKey(daysAgo(0)), dayKey(daysAgo(1)), dayKey(daysAgo(3)), dayKey(daysAgo(4))]);
    assert.equal(currentStreak(keys, NOW), 2);
  });
});

describe("streakFromDates", () => {
  it("dedupes multiple sessions on the same day", () => {
    assert.equal(streakFromDates([daysAgo(0, 9), daysAgo(0, 18), daysAgo(1, 8)], NOW), 2);
  });

  it("returns 0 for an empty history", () => {
    assert.equal(streakFromDates([], NOW), 0);
  });
});

describe("nextBestStep", () => {
  const base = {
    interviews: 1,
    questionsGenerated: 10,
    questionsPracticed: 10,
    mocksCompleted: 1,
    latestMock: { id: "mock-1", hasDebrief: true } as { id: string; hasDebrief: boolean } | null,
  };

  it("starts from zero interviews", () => {
    const step = nextBestStep({ ...base, interviews: 0, questionsGenerated: 0, questionsPracticed: 0, mocksCompleted: 0, latestMock: null });
    assert.equal(step.tone, "start");
    assert.equal(step.href, "/interviews/new");
  });

  it("asks for generation when questions are missing", () => {
    const step = nextBestStep({ ...base, questionsGenerated: 0, questionsPracticed: 0 });
    assert.equal(step.href, "/interviews");
    assert.match(step.title, /generate/i);
  });

  it("surfaces the remaining questions while practicing", () => {
    const step = nextBestStep({ ...base, questionsGenerated: 10, questionsPracticed: 7 });
    assert.match(step.title, /3 questions left/);
    assert.equal(step.href, "/interviews");
  });

  it("suggests a spoken mock once every question is practiced", () => {
    const step = nextBestStep({ ...base, mocksCompleted: 0, latestMock: null });
    assert.match(step.title, /spoken mock/i);
  });

  it("nudges toward the debrief when the last mock has none", () => {
    const step = nextBestStep({ ...base, latestMock: { id: "mock-9", hasDebrief: false } });
    assert.equal(step.tone, "review");
    assert.equal(step.href, "/history/mock-9");
  });

  it("suggests another session by default", () => {
    const step = nextBestStep(base);
    assert.equal(step.href, "/interviews/new");
    assert.equal(step.tone, "continue");
  });
});
