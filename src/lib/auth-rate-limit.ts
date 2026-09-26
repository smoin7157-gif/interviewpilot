import { RateLimiter, type RateLimitResult } from "@/lib/rate-limit";

/**
 * Rate limiting for the auth entry points (`/login`, `/signup`).
 *
 * Deliberately kept separate from the shared AI/expensive-endpoint limiter
 * (`checkRateLimit`): own `RateLimiter` instances, own key namespace, and own
 * ceilings. A brute-force run against an auth form can therefore never consume
 * the AI budget, and a busy AI session can never lock a user out of logging in.
 * Sliding-window and per-instance, like every other limiter in this app — a
 * best-effort brute-force guard, not a global quota.
 */
export const AUTH_RATE_LIMITS = {
  login: { limit: 10, windowMs: 15 * 60 * 1000 },
  signup: { limit: 10, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, { limit: number; windowMs: number }>;

export type AuthScope = keyof typeof AUTH_RATE_LIMITS;

const limiters = new Map<AuthScope, RateLimiter>();

function limiterFor(scope: AuthScope): RateLimiter {
  let limiter = limiters.get(scope);
  if (!limiter) {
    const { limit, windowMs } = AUTH_RATE_LIMITS[scope];
    limiter = new RateLimiter(limit, windowMs);
    limiters.set(scope, limiter);
  }
  return limiter;
}

/** Check one auth attempt against its scope's dedicated bucket. */
export function checkAuthRateLimit(scope: AuthScope, clientKey: string): RateLimitResult {
  return limiterFor(scope).check(clientKey);
}
