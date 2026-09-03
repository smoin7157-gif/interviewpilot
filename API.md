# InterviewPilot — API

All routes are server-side only and require the `ip_session` cookie (set by
auth). Responses are JSON. Errors use `{ "error": "message" }` with
appropriate status codes (`400` bad body, `401` unauthenticated, `404` missing
or not owned, `409` conflict, `422` validation).

## Auth

Auth is handled by server actions (HTML forms): `/signup`, `/login`, logout and
settings updates in `src/lib/auth-actions.ts`. No token is ever exposed to the
browser — an httpOnly, SameSite session cookie is used.

## Interviews

### `POST /api/interviews` → 201
Create an interview session (status `DRAFT`, no questions yet).

```json
{
  "role": "Software Development Engineer",
  "seniority": "Entry Level",
  "company": "Amazon",
  "jobDescription": "…",
  "questionCount": 10
}
```

### `GET /api/interviews` → 200
List the caller’s sessions, newest activity first, with `questionCount` and
`practicedCount`.

### `GET /api/interviews/{id}` → 200
Full session incl. questions. 404 when not owned.

### `DELETE /api/interviews/{id}` → `{ "ok": true }`
Deletes the session; questions and attempts cascade.

### `POST /api/interviews/{id}/generate` → NDJSON stream
Generates and persists questions for a `DRAFT` session. **Not** a JSON response:
a newline-delimited stream of events:

```text
{"type":"stage","key":"analyzing"}
{"type":"stage","key":"questions"}
{"type":"stage","key":"followups"}
{"type":"stage","key":"saving"}
{"type":"done","questionCount":10,"provider":"openrouter","model":"openai/gpt-4o-mini"}
```

`stage` events reflect real pipeline steps (the UI renders them as checkmarks);
`done` carries the final count + provider; `error` aborts the stream with a
user-safe message. Returns 409 if questions already exist.

### `GET /api/interviews/{id}/questions` → 200
Persisted questions in order, each with `category`, `difficulty`, `reason`,
`suggestedAnswer`, `followUps`, `status`, and latest `lastScore`.

## Questions

### `POST /api/questions/{id}/practice` → `{ "ok": true, "status": … }`
```json
{ "status": "PRACTICED" | "SKIPPED" | "NOT_STARTED" }
```

### `POST /api/questions/{id}/evaluate` → 200
Evaluates the user’s actual answer via AI, stores a `question_attempt`, and
marks the question `PRACTICED`.

```json
{ "answer": "…", "prompt": "optional override (e.g. a follow-up)" }
```
```json
{
  "attemptId": "…",
  "score": 78,
  "strengths": ["…"],
  "missing": ["…"],
  "improvements": ["…"],
  "provider": "openrouter",
  "model": "openai/gpt-4o-mini"
}
```

### `GET /api/questions/{id}/followups` → 200
```json
{ "question": "…", "followUps": ["…"] }
```

## Status codes recap

| Code | Meaning |
| --- | --- |
| 200/201 | success |
| 400 | unparseable body |
| 401 | missing/invalid session |
| 404 | resource not found **or not owned by caller** |
| 409 | generation already done for this session |
| 422 | validation failure (Zod) |
