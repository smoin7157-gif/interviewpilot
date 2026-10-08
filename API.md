# InterviewOS — API

All routes are server-side only and require the session cookie (set by auth),
except `GET /api/health`. Responses are JSON. Errors use `{ "error": "message" }`
with appropriate status codes (`400` bad body, `401` unauthenticated, `404`
missing or not owned, `409` conflict, `422` validation).

## Health

### `GET /api/health` → 200 / 503
Unauthenticated readiness probe: runs `SELECT 1` and returns `200` only when the
database answers. Use it to confirm a deploy is wired up (a page that renders
can still be backed by a blank `DATABASE_URL`).

```json
{ "status": "ok", "database": "reachable", "latencyMs": 12, "checkedAt": "…" }
```

On failure it answers `503` with `{ "status": "unhealthy", "database":
"unreachable", … }`. The body stays thin because the route is public — the real
Prisma error is logged server-side. A missing or blank `DATABASE_URL` never
gets this far in practice: the startup env check refuses to boot the server
(`src/lib/env.ts`).

## Auth

Auth is handled by server actions (HTML forms): `/signup`, `/login`, logout and
settings updates in `src/lib/auth-actions.ts`. No token is ever exposed to the
browser — an httpOnly, SameSite session cookie is used.

Both entry points are rate limited **per client IP** by a dedicated auth
limiter (`src/lib/auth-rate-limit.ts`), separate from the AI-endpoint buckets:
10 login attempts / 15 min and 10 signups / hour. Exceeding either returns a
form error (the server action renders it in place, no `429` page).

## Interviews

### `POST /api/interviews` → 201
Create an interview session (status `DRAFT`, no questions yet).

```json
{
  "role": "Software Development Engineer",
  "seniority": "3–5 years",
  "company": "Microsoft",
  "companyType": "Product Company",
  "interviewType": "Technical",
  "jobDescription": "…",
  "githubUrl": "https://github.com/username",
  "projects": [
    {
      "name": "HireAI",
      "repositoryUrl": "https://github.com/username/hireai",
      "description": "…",
      "techStack": "FastAPI, Supabase",
      "contribution": "Led backend design"
    }
  ],
  "questionCount": 10
}
```

`role` and `seniority` (experience level) are required. `company`,
`companyType`, `interviewType`, and `jobDescription` are optional. `githubUrl`
and `projects` (max 8) are optional candidate-context inputs.

### `GET /api/interviews` → 200
List the caller's sessions, newest activity first, with `questionCount`,
`practicedCount`, plus `companyType`/`interviewType` when set.

> The **paginated** list that backs `/interviews` is a server component query,
> not this route: `listSessionsPage` returns 10 rows per page with cursor links
> (`?cursor=<id>&dir=older|newer`) and accepts a server-side search/status
> filter (`?q=<role or company>&status=all|ready|practiced|draft`). This route
> stays unpaginated and unfiltered for API callers.

### `GET /api/interviews/{id}` → 200
Full session incl. questions. 404 when not owned.

### `DELETE /api/interviews/{id}` → `{ "ok": true }`
Deletes the session; questions and attempts cascade.

### `POST /api/interviews/{id}/generate` → NDJSON stream
Generates and persists questions for a `DRAFT` session. **Not** a JSON
response: a newline-delimited stream of events:

```text
{"type":"stage","key":"analyzing"}
{"type":"stage","key":"questions"}
{"type":"stage","key":"followups"}
{"type":"stage","key":"saving"}
{"type":"done","questionCount":10,"provider":"openrouter","model":"openai/gpt-4o-mini"}
```

`stage` events reflect real pipeline steps (the UI renders them as
checkmarks); `done` carries the final count + provider; `error` aborts the
stream with a user-safe message. Returns 409 if questions already exist.

### `GET /api/interviews/{id}/questions` → 200
Persisted questions in order, each with `category`, `difficulty`, `reason`,
`suggestedAnswer`, `followUps`, `sourceContext`, `status`, and latest
`lastScore`. The `session` object includes `role`, `seniority`, `company`,
`companyType`, `interviewType`, `jobDescription`, and `status`.

### `POST /api/interviews/{id}/github` → 200
Validates the URL, fetches the **public** GitHub profile, and stores a summary
on the session.

```json
{ "url": "https://github.com/username" }
```
```json
{
  "ok": true,
  "username": "username",
  "repoCount": 23,
  "languages": ["TypeScript", "Python"],
  "topRepos": [{ "name": "hireai", "language": "TypeScript", "stars": 12 }]
}
```

### `POST /api/interviews/{id}/resume` → 200 (`multipart/form-data`)
Uploads a **PDF** resume (≤ 3 MB), extracts its text server-side, runs
structured extraction (live AI with a deterministic fallback — never invents
facts), and stores the parsed sections on the session.

```text
form-data: resume=@resume.pdf
```
```json
{
  "ok": true,
  "filename": "resume.pdf",
  "provider": "openrouter",
  "summary": { "skills": 14, "experience": 3, "projects": 2, "education": 1, "technologies": 9 }
}
```

## AI Mock Interviews (spoken practice)

Voice runs in the browser (no keys): mic permission + optional private camera
self-view via `getUserMedia`, speech-to-text via the Web Speech API, and TTS
via `speechSynthesis`. The interviewer brain is server-side and driven by the
same provider abstraction as question generation. Raw audio/video is never
stored — only transcripts.

### `POST /api/mock-interviews` → 200/201
Creates a mock session for an owned, generated interview, or returns the
in-progress one (`resumed: true`).

```json
{ "interviewSessionId": "…", "maxQuestions": 10 }
```
```json
{ "mockSessionId": "…", "status": "SESSION_STARTED", "resumed": false, "maxQuestions": 10 }
```

Rejects with 422 when the interview has no generated questions yet.

### `GET /api/mock-interviews?interviewSessionId=…` → 200
Returns `{ "active": { …lastQuestion } | null }` — used by the mock screen to
resume an unfinished session.

### `GET /api/mock-interviews/{id}` → 200
Session status, counts, and the full ordered transcript (`speaker`, `text`,
`action`, `category`, `difficulty` per turn). 404 when not owned.

### `POST /api/mock-interviews/{id}/turn` → 200
One exchange. The **first** call (empty `transcript`) opens the interview; every
later call carries the candidate's spoken answer and returns the interviewer's
next move as structured output.

```json
{ "transcript": "I chose Supabase because it gave us Postgres and auth…" }
```
```json
{
  "action": "ask_followup",
  "text": "You mentioned Postgres — what made a relational DB the right fit here?",
  "category": "project",
  "difficulty": "medium",
  "reason": "Probing the candidate's actual answer",
  "questionNumber": 2,
  "maxQuestions": 10,
  "completed": false,
  "provider": "openrouter",
  "model": "openai/gpt-4o-mini"
}
```

`action` is one of `ask_question | ask_followup | move_topic | end_interview`.
When `completed: true` the session is closed (status `SESSION_COMPLETE`). 422
when an answer is expected but empty; 409 when the session is finished.

### `POST /api/mock-interviews/{id}/end` → 200
Ends the session (`SESSION_COMPLETE`, sets `endedAt`).

```json
{ "reason": "user" | "ai" }
```

### `POST /api/mock-interviews/{id}/debrief` → 200
Generates and persists a session debrief from the stored transcript, or returns
the stored one when it already exists (pass `{ "force": true }` to
regenerate). Requires at least 2 spoken candidate answers (422 otherwise).
Persists `overallScore` + `debrief` on the session.

```json
{ "force": false }
```
```json
{
  "mockSessionId": "…",
  "overallScore": 78,
  "debrief": {
    "overallScore": 78,
    "breakdown": [
      { "dimension": "technical", "score": 75, "note": "…" },
      { "dimension": "communication", "score": 82, "note": "…" },
      { "dimension": "structure", "score": 70, "note": "…" },
      { "dimension": "relevance", "score": 80, "note": "…" },
      { "dimension": "project_knowledge", "score": 74, "note": "…" },
      { "dimension": "problem_solving", "score": 78, "note": "…" }
    ],
    "strengths": ["…"],
    "weaknesses": ["…"],
    "missedOpportunities": ["…"],
    "strongestAnswer": { "question": "…", "why": "…" },
    "weakestAnswer": { "question": "…", "why": "…" },
    "recommendedPractice": ["…"],
    "provider": "openrouter",
    "model": "openai/gpt-4o-mini"
  },
  "generated": true
}
```

### `DELETE /api/mock-interviews/{id}` → `{ "ok": true }`
Deletes a mock session (turns cascade). Ownership-scoped; 404 when not owned.

### `GET /api/mock-interviews/history` → 200
All of the caller's mock sessions, newest first, with interview context
(`role`, `company`, `seniority`, `interviewType`), `status`, `overallScore`,
`hasDebrief`, `questionsAsked`, and timestamps.

> `/history` uses `listOwnedMocksPage` instead (10 rows per page, same cursor
> links, plus `?q=&status=all|complete|active|scored`), so the page stays a flat
> query as history grows. `/dashboard` uses `listScoreTrend` for the progress
> chart: scored sessions only, oldest first.

## Questions

### Written-practice autosave (server action, not a route)
The workspace autosaves the answer being typed through the
`saveAnswerDraftAction` Server Action (`src/lib/draft-actions.ts`), debounced
~2.5s after the last keystroke and flushed when the tab hides or unloads. It
authenticates per call and is ownership-scoped (`session.userId` in the WHERE
clause), accepts `{ questionId, draftAnswer }` (empty clears the draft), and
returns `{ ok: true, draftSavedAt }` or `{ ok: false, error }`. Drafts live on
`interview_questions.draftAnswer` — a submitted answer still becomes a
`question_attempt` via the evaluate route below.

### `POST /api/questions/{id}/practice` → `{ "ok": true, "status": … }`
```json
{ "status": "PRACTICED" | "SKIPPED" | "NOT_STARTED" }
```

### `POST /api/questions/{id}/evaluate` → 200
Evaluates the user's actual answer via AI, stores a `question_attempt`, and
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
| 429 | rate limit exceeded (AI/expensive endpoints; `Retry-After` header) |

## Planned endpoints (not implemented — see ROADMAP.md)

```text
PATCH  /api/interviews/:id                       (edit setup)
```
