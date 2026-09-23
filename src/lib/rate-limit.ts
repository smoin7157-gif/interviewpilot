import { NextResponse } from "next/server";

/**
 * In-memory sliding-window rate limiter.
 *
 * Intended as a best-effort per-user throttle on AI/expensive endpoints.
 * On serverless platforms each function instance keeps its own counters, so
 * this bounds abuse per instance but is not a global quota — acceptable for
 * this app's threat model, and dependency-free so it can be unit-tested.
 */

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now
  ) {}

  check(key: string): RateLimitResult {
    const t = this.now();
    const windowStart = t - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((ts) => ts > windowStart);

    if (recent.length >= this.limit) {
      const oldest = recent[0];
      return {
        ok: false,
        retryAfterSeconds: Math.max(1, Math.ceil((oldest + this.windowMs - t) / 1000)),
      };
    }

    recent.push(t);
    this.hits.set(key, recent);

    // Opportunistic cleanup so the map can't grow unbounded across keys.
    if (this.hits.size > 10_000) {
      for (const [k, arr] of this.hits) {
        const alive = arr.filter((ts) => ts > windowStart);
        if (alive.length === 0) this.hits.delete(k);
        else this.hits.set(k, alive);
      }
    }

    return { ok: true };
  }
}

/** Shared buckets keyed by their window config, so routes with the same
 *  limit/window reuse one limiter. */
const buckets = new Map<string, RateLimiter>();

/** Convenience wrapper: check a key against a shared limiter config. */
export function checkRateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): RateLimitResult {
  const bucketKey = `${opts.limit}:${opts.windowMs}`;
  let limiter = buckets.get(bucketKey);
  if (!limiter) {
    limiter = new RateLimiter(opts.limit, opts.windowMs);
    buckets.set(bucketKey, limiter);
  }
  return limiter.check(key);
}

/**
 * Best-effort client identity for rate-limit keys. Server actions read the
 * forwarded headers Vercel/the proxy sets via next/headers. The value is only
 * used as a bucket key (never trusted for auth), and unknown clients share one
 * fallback bucket — better than a fully global bucket, without pretending
 * spoofed headers are real identity.
 */
export function getClientKey(headers: Headers, scope: string): string {
  const forwarded = headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();
  const realIp = ip || headers.get("x-real-ip") || undefined;
  return `${scope}:${realIp ?? "unknown"}`;
}

/** Build the standard 429 response (with Retry-After) for API routes. */
export function rateLimitError(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}