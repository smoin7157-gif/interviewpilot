# InterviewOS — API

All routes are server-side only and require the session cookie (set by auth).
Responses are JSON. Errors use `{ "error": "message" }` with appropriate
status codes (`400` bad body, `401` unauthenticated, `404` missing or not
owned, `409` conflict, `422` validation).

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

## Questions

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

## Planned endpoints (not implemented — see ROADMAP.md)

```text
PATCH  /api/interviews/:id                       (edit setup)
POST   /api/mock-interviews                       (start voice session)
GET    /api/mock-interviews/:id
POST   /api/mock-interviews/:id/turn              (AI question / candidate answer)
POST   /api/mock-interviews/:id/end
GET    /api/mock-interviews/:id/debrief
```
