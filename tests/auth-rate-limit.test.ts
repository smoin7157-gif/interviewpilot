import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AUTH_RATE_LIMITS, checkAuthRateLimit } from "../src/lib/auth-rate-limit";
import { checkRateLimit } from "../src/lib/rate-limit";

describe("auth rate limiting", () => {
  it("blocks login attempts once the login limit is reached", () => {
    const key = "login-brute-force-test";
    for (let i = 0; i < AUTH_RATE_LIMITS.login.limit; i++) {
      assert.equal(checkAuthRateLimit("login", key).ok, true);
    }
    const blocked = checkAuthRateLimit("login", key);
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.ok(blocked.retryAfterSeconds > 0);
  });

  it("keeps login and signup in separate buckets", () => {
    const key = "shared-client-scope-test";
    for (let i = 0; i < AUTH_RATE_LIMITS.signup.limit; i++) {
      assert.equal(checkAuthRateLimit("signup", key).ok, true);
    }
    assert.equal(checkAuthRateLimit("signup", key).ok, false);
    // Signup traffic for this client must not touch the login bucket.
    assert.equal(checkAuthRateLimit("login", key).ok, true);
  });

  it("does not share storage with the AI/expensive-endpoint limiter", () => {
    const key = "auth-vs-ai-separation";
    for (let i = 0; i < AUTH_RATE_LIMITS.login.limit; i++) {
      checkAuthRateLimit("login", key);
    }
    assert.equal(checkAuthRateLimit("login", key).ok, false);
    // Even with an identical config, the shared limiter is a different bucket,
    // so exhausting the auth limiter never exhausts an AI endpoint (or 429s
    // login because generation ran hot).
    assert.equal(checkRateLimit(key, { ...AUTH_RATE_LIMITS.login }).ok, true);
  });
});
