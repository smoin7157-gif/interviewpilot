import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clearStableInputCache,
  debriefStablePayload,
  getStableCached,
  normalizeStableText,
  seedFromStableHash,
  setStableCached,
  stableInputHash,
} from "../src/lib/ai/stable-input-cache";

describe("stable-input-cache", () => {
  it("normalizes whitespace for stable keys", () => {
    assert.equal(normalizeStableText("  hello \n\n world "), "hello world");
    assert.equal(
      stableInputHash("a", { t: normalizeStableText("foo   bar") }),
      stableInputHash("a", { t: "foo bar" })
    );
  });

  it("returns cached values until cleared", () => {
    clearStableInputCache();
    const key = stableInputHash("test", { id: 1 });
    assert.equal(getStableCached<number>(key), undefined);
    setStableCached(key, 42);
    assert.equal(getStableCached<number>(key), 42);
    clearStableInputCache();
    assert.equal(getStableCached<number>(key), undefined);
  });

  it("maps a hash to a non-negative 31-bit seed", () => {
    const hash = stableInputHash("seed", { x: 1 });
    const seed = seedFromStableHash(hash);
    assert.ok(seed >= 0 && seed <= 0x7fffffff);
    assert.equal(seedFromStableHash(hash), seed);
  });

  it("hashes debrief payloads consistently across whitespace in transcript", () => {
    const base = {
      role: "Backend Engineer",
      seniority: "3–5 years",
      maxQuestions: 10,
      transcript: [{ speaker: "INTERVIEWER" as const, text: "Tell me about on-call." }],
    };
    const a = stableInputHash("service:debrief", debriefStablePayload({ ...base, transcript: [{ speaker: "INTERVIEWER", text: "  Tell me   about on-call. " }] }));
    const b = stableInputHash("service:debrief", debriefStablePayload({ ...base, transcript: [{ speaker: "INTERVIEWER", text: "Tell me about on-call." }] }));
    assert.equal(a, b);
  });
});