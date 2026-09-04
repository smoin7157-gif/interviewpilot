# InterviewOS — Architecture

> Practice your interview before the real one.

## Overview

Next.js 16 App Router monolith: pages render on the server with React Server
Components; interactivity lives in client components; AI and database access
happen exclusively server-side (server components, server actions, and route
handlers). SQLite via Prisma, session auth via signed cookies.

```
Browser
  │  (React Server Components + client components)
  ▼
Next.js App Router
  ├── (app)  → protected pages (dashboard, interviews, workspace, faq, settings)
  ├── (auth) → /login /signup (server actions)
  └── /api   → route handlers (interviews CRUD, generate, evaluate, …)
        │
        ▼
   lib/
  ├── auth.ts                session cookie (jose HS256) + bcrypt
  ├── data.ts                ownership-scoped Prisma queries
  ├── validation.ts          zod schemas (shared by UI + API)
  ├── candidate-context.ts   normalized candidate-context types + summary
  ├── resume.ts              PDF → text extraction
  ├── github.ts              public GitHub profile analysis
  └── ai/
      ├── service.ts     facade: pick provider, retry, graceful fallback
      ├── openrouter.ts  OpenRouter chat-completions provider (+ resume extraction)
      ├── fallback.ts    deterministic offline provider (+ resume extractor)
      ├── prompts.ts     system/user prompt builders
      └── validate.ts    tolerant JSON extraction + strict validation
```

## Key decisions

1. **One app, no CORS complexity.** AI calls happen inside route handlers, so
   API keys never reach the client. Auth uses server actions with an httpOnly
   signed session cookie — no tokens in the browser.
2. **Provider abstraction.** `AIProvider` exposes `generateQuestions`,
   `generateFollowUps`, `evaluateAnswer`. OpenRouter is the primary provider;
   when it is unconfigured, fails, or returns invalid output, the service
   retries once (on retryable failures) and then falls back to the
   deterministic `FallbackProvider`. Responses identify `provider`/`model` so
   the UI can note fallback mode. This is the seam where future providers
   (speech-to-text, text-to-speech, mock-interview driver) plug in.
3. **Structured, validated AI output.** Generation prompts demand strict JSON;
   `validate.ts` strips fences/prose, extracts the JSON object, and validates
   with Zod. Malformed output is never rendered.
4. **Streaming generation with honest stages.** `POST /api/interviews/[id]/generate`
   returns NDJSON events (`stage` / `done` / `error`) reflecting real pipeline
   steps — no fake progress.
5. **Session ownership everywhere.** Every query and mutation filters by the
   session user, enforced in `data.ts` and every route handler. Deleting a
   session cascades to questions and attempts.
6. **Cache-free workspace.** Question data is persisted at generation time and
   reused; selecting questions never triggers AI calls. Follow-ups are
   generated up-front with each question and served from the DB.

## Routing map

| Area | Files |
| --- | --- |
| Landing | `src/app/page.tsx` |
| Auth | `src/app/(auth)/*`, `src/lib/auth-actions.ts` |
| Shell | `src/components/app-shell.tsx` (sidebar, mobile drawer) |
| Dashboard | `src/app/(app)/dashboard/page.tsx` |
| Interviews list | `src/app/(app)/interviews/page.tsx` |
| Create flow | `src/app/(app)/interviews/new/page.tsx` + `new-interview-flow.tsx` (setup → sync → generate) |
| Resume/GitHub attach | `src/app/api/interviews/[id]/resume/route.ts`, `src/app/api/interviews/[id]/github/route.ts` |
| Workspace | `src/app/(app)/interviews/[id]/page.tsx` + `interview-workspace.tsx` |
| FAQ | `src/app/(app)/faq/page.tsx` |
| Settings | `src/app/(app)/settings/page.tsx` |
| API | `src/app/api/**` |

## Domain vocabulary (InterviewOS V1)

Interview setup captures the candidate's **target job**:

- `role` — free-text job role (required), e.g. "Software Development Engineer"
- `seniority` — experience level (required): Fresher / 0–1 years / 1–3 years /
  3–5 years / 5+ years. *(DB field is named `seniority`; values are the
  InterviewOS experience levels.)*
- `company` — optional target company
- `companyType` — optional: Product Company / Service Company / Startup /
  MNC / Consulting / Other
- `interviewType` — optional: General / Technical / Behavioral / HR Recruiter /
  Coding / System Design / Data ML / Product / Mixed
- `jobDescription` — optional pasted JD (context for generation)
- `questionCountTarget` — 10 / 15 / 20

## Candidate context (Phase 2)

Beyond the target job, setup can capture the candidate's actual background:

- **Resume** — PDF upload, text extracted server-side (`src/lib/resume.ts`), then
  structured into `{ skills, experience, education, projects, achievements,
  certifications, technologies }` by the AI provider abstraction (live
  extraction with a deterministic offline extractor as fallback). Only facts
  present in the file are kept — nothing is ever invented. Raw files are not
  stored.
- **GitHub** — a profile URL is validated and its **public** repositories are
  fetched (`src/lib/github.ts`, unauthenticated GitHub API). Private repos are
  never accessed; anonymous rate limits are respected and surfaced as
  actionable errors with a "continue without GitHub" path.
- **Projects** — manual entries (name, repo URL, description, tech stack,
  contribution) persisted in `candidate_projects`.

All of it is normalized into one compact summary
(`src/lib/candidate-context.ts`) that the question engine receives — never raw
resume text — keeping prompt size and cost in check (§27 of the spec).

## Question engine (Phase 2)

Generation now uses InterviewOS categories (`technical`, `behavioral`,
`project`, `job_description`, `coding`, `system_design`, `data_ml`, `company`,
`general`), lowercase `easy|medium|hard` difficulty, per-interview-type
question distributions, and per-question `source_context` tags. The prompt is
instructed to probe the candidate's real claims ("You built HireAI with
FastAPI — why FastAPI?") and never invent experience. Legacy rows keep their
older category labels and render fine through display helpers.

## Client/server split

- **Server components**: landing, auth pages, dashboard, lists, workspace
  hydration, FAQ (they own auth + DB reads).
- **Client components**: auth forms, create-interview form, streaming
  generation panel, interview workspace (tabs, reveal/hide, practice,
  evaluation, keyboard nav), session delete menu.
- **Server actions**: `signupAction`, `loginAction`, `logoutAction`,
  `updateProfileAction`, `changePasswordAction`.
- **Route handlers**: data API + AI endpoints (see API.md).

## Environment

See `.env.example`. `AUTH_SECRET` signs session cookies; `OPENROUTER_API_KEY`
enables live AI (optional — the deterministic fallback keeps the flow working
without it). `DATABASE_URL` points at the local SQLite file. All keys are
server-side only.

## Future modules (extension points)

AI Mock Interview, Debrief, and remaining Phase 2 items (answer-reactive
follow-ups, DOCX resumes) are planned (see ROADMAP.md). Extending the model
means adding tables + owner-scoped services under `src/lib/`, route groups per
module, and sidebar entries — nothing about the current data flow needs to
change shape. The AI provider layer is where voice (STT/TTS) and richer
capabilities slot in later.
