# InterviewPilot — Architecture

## Overview

Next.js 16 App Router monolith: pages render on the server with RSC; interactivity
lives in client components; AI and database access happen exclusively server-side
(server components, server actions, and route handlers). SQLite via Prisma,
session auth via signed cookies.

```
Browser
  │  (React Server Components + client components)
  ▼
Next.js App Router
  ├── (app)  → protected pages (dashboard, interviews, workspace, settings)
  ├── (auth) → /login /signup (server actions)
  └── /api   → route handlers (interviews CRUD, generate, evaluate, …)
        │
        ▼
   lib/
  ├── auth.ts        session cookie (jose HS256) + bcrypt
  ├── data.ts        ownership-scoped Prisma queries
  ├── validation.ts  zod schemas (shared by UI + API)
  └── ai/
      ├── service.ts     facade: pick provider, retry, graceful fallback
      ├── openrouter.ts  OpenRouter chat-completions provider
      ├── fallback.ts    deterministic offline provider
      ├── prompts.ts     system/user prompt builders
      └── validate.ts    tolerant JSON extraction + strict validation
```

## Key decisions

1. **One app, no CORS complexity.** The spec forbids calling OpenRouter from the
   browser; all AI calls happen inside route handlers, so the API key never
   reaches the client.
2. **Provider abstraction.** `AIProvider` exposes `generateQuestions`,
   `generateFollowUps`, `evaluateAnswer`. OpenRouter is the primary provider;
   if it is unconfigured, fails, or returns invalid output, the service retries
   once (on retryable failures) and then falls back to the deterministic
   `FallbackProvider`. Responses identify `provider`/`model` so the UI can note
   fallback mode.
3. **Structured, validated AI output.** Generation prompts demand strict JSON;
   `validate.ts` strips fences/prose, extracts the JSON object, and validates
   with Zod, coercing category/difficulty variants. Rows that fail minimum
   quality checks are dropped. Malformed output is never rendered.
4. **Streaming generation with honest stages.** `POST /api/interviews/[id]/generate`
   returns NDJSON events (`stage` / `done` / `error`) reflecting real pipeline
   steps; the UI renders discrete stage checkmarks — no fake percentages.
5. **Session ownership everywhere.** Every query and mutation filters by the
   session user (`session.userId === user.id`), enforced in `data.ts` and every
   route handler. Deleting a session cascades to questions and attempts.
6. **Cache-free workspace.** Question data is persisted at generation time and
   reused; selecting questions never triggers AI calls. Follow-ups are generated
   up-front with each question and served from the DB.

## Routing map

| Area | Files |
| --- | --- |
| Landing | `src/app/page.tsx` |
| Auth | `src/app/(auth)/*`, `src/lib/auth-actions.ts` |
| Shell | `src/components/app-shell.tsx` (sidebar, mobile drawer) |
| Interviews list | `src/app/(app)/interviews/page.tsx` |
| Create flow | `src/app/(app)/interviews/new/page.tsx` + `new-interview-flow.tsx` + `generate-interview.tsx` |
| Workspace | `src/app/(app)/interviews/[id]/page.tsx` + `interview-workspace.tsx` |
| Settings | `src/app/(app)/settings/page.tsx` |
| API | `src/app/api/**` |

## Client/server split

- **Server components**: landing, auth pages, app shell data, lists, workspace
  hydration (they own auth + DB reads).
- **Client components**: auth forms, create-interview form, streaming generation
  panel, interview workspace (tabs, reveal/hide, practice, evaluation, keyboard
  nav), session delete menu.
- **Server actions**: `signupAction`, `loginAction`, `logoutAction`,
  `updateProfileAction`, `changePasswordAction`.
- **Route handlers**: data API + AI endpoints (see API.md).

## Future-proofing for InterviewOS

Modules like Resume Intelligence, Readiness, Roadmap, and Mock Interviews were
deliberately not built. Extending the model means adding tables + owner-scoped
services under `src/lib/`, route groups per module, and sidebar entries —
nothing about the current data flow needs to change shape. The provider
abstraction is the seam where richer AI capabilities (voice, coding, system
design) would slot in later.
