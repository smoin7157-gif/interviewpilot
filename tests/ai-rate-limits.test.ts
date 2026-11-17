import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { API_RATE_LIMITS } from "../src/lib/ai-rate-limits";
import { rateLimitError } from "../src/lib/rate-limit";

describe("API_RATE_LIMITS", () => {
  it("keeps generate and resume limits stricter than evaluate", () => {
    assert.ok(API_RATE_LIMITS.generate.limit <= API_RATE_LIMITS.evaluate.limit);
    assert.ok(API_RATE_LIMITS.resume.limit <= API_RATE_LIMITS.evaluate.limit);
  });
});

describe("rateLimitError shape", () => {
  it("includes retryAfterSeconds without leaking internals", async () => {
    const res = rateLimitError(30);
    assert.equal(res.status, 429);
    const body = (await res.json()) as { error: string; retryAfterSeconds: number };
    assert.equal(body.retryAfterSeconds, 30);
    assert.doesNotMatch(body.error, /stack|password|OPENROUTER/i);
  });
});