/**
 * Server-side AI and expensive endpoint limits (per authenticated user, per window).
 * Keys are `${scope}:${user.id}` — see `checkRateLimit` in API routes.
 */
export const API_RATE_LIMITS = {
  evaluate: { limit: 60, windowMs: 60 * 60 * 1000 },
  followUp: { limit: 60, windowMs: 60 * 60 * 1000 },
  practice: { limit: 60, windowMs: 60 * 60 * 1000 },
  generate: { limit: 10, windowMs: 60 * 60 * 1000 },
  resume: { limit: 10, windowMs: 60 * 60 * 1000 },
  debrief: { limit: 15, windowMs: 60 * 60 * 1000 },
  mockTurn: { limit: 200, windowMs: 60 * 60 * 1000 },
  mockCreate: { limit: 20, windowMs: 60 * 60 * 1000 },
  github: { limit: 20, windowMs: 60 * 60 * 1000 },
  interviewCreate: { limit: 30, windowMs: 60 * 60 * 1000 },
  interviewEdit: { limit: 60, windowMs: 60 * 60 * 1000 },
} as const;