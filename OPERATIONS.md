# Operations guide (InterviewOS)

## Required environment variables

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Always | `postgresql://` or `postgres://` |
| `AUTH_SECRET` | Always | ≥ 16 random chars; signs session cookies |
| `OPENROUTER_API_KEY` | Production | Optional in dev (fallback question bank) |

## Optional (live AI tuning)

| Variable | Purpose |
|----------|---------|
| `OPENROUTER_MODEL` | Primary chat model |
| `OPENROUTER_CHEAP_MODEL` | Resume extraction only |
| `OPENROUTER_BASE_URL` | Override API base |
| `APP_URL` | OpenRouter HTTP-Referer / canonical site URL |

Validated at Node startup via `src/instrumentation.ts` → `assertEnv()`. Secret **values** are never logged.

## Observability

- **Health:** `GET /api/health` — DB reachability, latency, app `version`, AI mode (`live` vs `fallback`). Unauthenticated; no PII in body.
- **Structured ops logs:** `[ops]` JSON lines from `src/lib/ops-log.ts` (operation, outcome, durationMs, optional userId). Details truncated and redacted.
- **AI retries:** `[ai]` logs use `sanitizeAiLogMessage` (no full prompts/resumes).

## Resilience

- OpenRouter: per-task timeouts (`REQUEST_TIMEOUT_MS` in `openrouter.ts`).
- Service layer: up to 3 attempts on transient failures, then deterministic fallback (`withRetry` in `service.ts`).
- Health probe: 5s DB timeout → HTTP 503.

## Data ownership

Use `interviewSessionOwnedWhere`, `questionOwnedWhere`, and `mockSessionOwnedWhere` from `src/lib/owned-resource.ts` on all scoped queries.