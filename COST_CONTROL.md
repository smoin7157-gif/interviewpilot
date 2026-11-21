# Cost control and abuse prevention

## Content-hash caches (in-memory, 10 min TTL, max 128 entries)

| Cache namespace | Key inputs |
|-----------------|------------|
| `service:evaluate` | Normalized prompt, answer, role, seniority, suggested answer |
| `service:resume` | Normalized resume text |
| `service:followup` | Follow-up context payload |
| `service:debrief` | Normalized transcript + session context |
| `service:interviewer` | History + question bank snapshot |

Identical inputs within TTL **do not call OpenRouter again**. Logs: `[ops] … "detail":"cache_hit"` via `ai-cache:*`.

## Rate limits

See `src/lib/ai-rate-limits.ts`. Enforced in API routes before any model work.

## Early exits (no model call)

| Path | Condition |
|------|-----------|
| Resume extraction | Text shorter than `MIN_RESUME_TEXT_CHARS` → heuristic only |
| Resume upload API | Extracted text shorter than `MIN_RESUME_UPLOAD_CHARS` → HTTP 422 |
| Interview generate | Questions already exist → HTTP 409 |
| Mock debrief | Stored debrief unless `force: true` |

## Adjusting limits

Change `API_RATE_LIMITS` or cache TTL in `stable-input-cache.ts` (`TTL_MS`, `MAX_ENTRIES`).