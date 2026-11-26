/**
 * User-facing API error messages shared by client components.
 * Keeps 429 Retry-After handling consistent across the workspace.
 */

import { DATABASE_UNAVAILABLE_MESSAGE } from "@/lib/db-errors";

export function rateLimitMessage(retryAfterHeader: string | null): string {
  const retryAfter = Number(retryAfterHeader);
  const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : null;
  if (wait === null) return "You're moving quickly — please wait a minute and try again.";
  if (wait < 90) return `You're moving quickly — try again in about ${wait}s.`;
  return `You're moving quickly — try again in about ${Math.ceil(wait / 60)} min.`;
}

export function apiFailureMessage(
  status: number,
  retryAfterHeader: string | null,
  bodyError: string | undefined,
  fallback: string
): string {
  if (status === 429) return rateLimitMessage(retryAfterHeader);
  if (status === 503) {
    if (bodyError && bodyError.trim().length > 0) return bodyError;
    return DATABASE_UNAVAILABLE_MESSAGE;
  }
  if (bodyError && bodyError.trim().length > 0) return bodyError;
  return fallback;
}