import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clearStableInputCache,
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
});