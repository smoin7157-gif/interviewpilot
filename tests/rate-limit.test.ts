import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RateLimiter } from "../src/lib/rate-limit";

function makeClock() {
  let t = 0;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe("RateLimiter", () => {
  it("allows requests up to the limit", () => {
    const clock = makeClock();
    const limiter = new RateLimiter(3, 60_000, clock.now);
    assert.equal(limiter.check("k").ok, true);
    assert.equal(limiter.check("k").ok, true);
    assert.equal(limiter.check("k").ok, true);
  });

  it("blocks once the limit is exceeded", () => {
    const clock = makeClock();
    const limiter = new RateLimiter(2, 60_000, clock.now);
    limiter.check("k");
    limiter.check("k");
    const third = limiter.check("k");
    assert.equal(third.ok, false);
    if (!third.ok) assert.ok(third.retryAfterSeconds > 0);
  });

  it("reports how long until retry", () => {
    const clock = makeClock();
    const limiter = new RateLimiter(1, 60_000, clock.now);
    limiter.check("k");
    clock.advance(10_000);
    const blocked = limiter.check("k");
    assert.equal(blocked.ok, false);
    if (!blocked.ok) {
      // 50s remain in the window (60s window, 10s elapsed).
      assert.ok(blocked.retryAfterSeconds >= 49 && blocked.retryAfterSeconds <= 50);
    }
  });

  it("releases after the window elapses", () => {
    const clock = makeClock();
    const limiter = new RateLimiter(1, 60_000, clock.now);
    limiter.check("k");
    assert.equal(limiter.check("k").ok, false);
    clock.advance(61_000);
    assert.equal(limiter.check("k").ok, true);
  });

  it("tracks keys independently", () => {
    const clock = makeClock();
    const limiter = new RateLimiter(1, 60_000, clock.now);
    limiter.check("user-a");
    assert.equal(limiter.check("user-a").ok, false);
    assert.equal(limiter.check("user-b").ok, true);
  });
});