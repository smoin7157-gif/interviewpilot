import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generationTokenBudget } from "../src/lib/ai/openrouter";

/**
 * Guards the output budget for live question generation.
 *
 * The budget must stay affordable for a modest OpenRouter balance (so live
 * generation actually runs instead of silently falling back) while never
 * exceeding what the model can emit.
 */

describe("generationTokenBudget", () => {
  it("scales with the number of questions", () => {
    assert.ok(generationTokenBudget(20) > generationTokenBudget(15));
    assert.ok(generationTokenBudget(15) > generationTokenBudget(10));
    assert.ok(generationTokenBudget(10) > generationTokenBudget(1));
  });

  it("leaves enough room for the whole set without asking for the full 16k ceiling", () => {
    // ~250 output tokens per question; the budget must cover that comfortably.
    for (const count of [10, 15, 20]) {
      assert.ok(
        generationTokenBudget(count) >= count * 400,
        `${count} questions would be truncated by a ${generationTokenBudget(count)}-token budget`
      );
    }
    assert.ok(generationTokenBudget(10) < 16_000, "a 10-question set must not ask for the ceiling");
  });

  it("never exceeds the model's completion ceiling", () => {
    assert.equal(generationTokenBudget(1_000), 16_000);
  });

  it("survives a nonsensical count", () => {
    assert.ok(generationTokenBudget(0) > 0);
    assert.ok(generationTokenBudget(-5) > 0);
  });
});
