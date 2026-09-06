# InterviewOS — Architecture

> Practice your interview before the real one.

## Overview

Next.js 16 App Router monolith: pages render on the server with React Server
Components; interactivity lives in client components; AI and database access
happen exclusively server-side (server components, server actions, and route
handlers). PostgreSQL via Prisma (Neon serverless Postgres — Vercel-compatible),
session auth via signed cookies.

```
Browser
  │  (React Server Components + client components)
  ▼
Next.js App Router
  ├── (app)   → protected pages (dashboard, interviews, workspace, faq, settings)
  ├── (focus) → protected, shell-less pages (AI mock interview screen)
  ├── (auth)  → /login /signup (server actions)
  └── /api    → route handlers (interviews CRUD, generate, evaluate, mock …)
        │
        ▼
   lib/
  ├── auth.ts                session cookie (jose HS256) + bcrypt
  ├── data.ts                ownership-scoped Prisma queries
  ├── mock.ts                mock-interview queries + interviewer context builder + history rows
  ├── debrief.ts             debrief context assembly + transcript budget (Phase 4)
  ├── validation.ts          zod schemas (shared by UI + API)
  ├── candidate-context.ts   normalized candidate-context types + summary
  ├── resume.ts              PDF → text extraction
  ├── github.ts              public GitHub profile analysis
  ├── speech.ts              client-only replaceable speech layer (STT/TTS/media)
  └── ai/
      ├── service.ts     facade: pick provider, retry, graceful fallback
      ├── openrouter.ts  OpenRouter chat-completions provider (+ interviewer)
      ├── fallback.ts    deterministic offline provider (+ interviewer + resume)
      ├── prompts.ts     system/user prompt builders
      └── validate.ts    tolerant JSON extraction + strict validation
```

## Key decisions

1. **One app, no CORS complexity.** AI calls happen inside route handlers, so
   API keys never reach the client. Auth uses server actions with an httpOnly
   signed session cookie — no tokens in the browser.
2. **Provider abstraction.** `AIProvider` exposes `generateQuestions`,
   `generateFollowUps`, `evaluateAnswer`, `extractResume`,
   `driveInterview` (the live mock-interviewer), and `generateDebrief`
   (Phase 4). OpenRouter is the primary provider; when it is unconfigured,
   fails, or returns invalid output, the service retries once (on retryable
   failures) and then falls back to the deterministic `FallbackProvider` —
   including a deterministic interviewer and a heuristic debrief scorer that
   is honest about which dimensions had evidence. Responses identify
   `provider`/`model` so the UI can note fallback mode.
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
7. **Voice runs in the browser; the interviewer runs on the server.** The mock
   interview screen (`/mock/[id]`) requests mic (required) and camera
   (optional self-view) only after the user presses Start, and uses the
   replaceable speech layer in `src/lib/speech.ts` (Web Speech API STT +
   speechSynthesis TTS). Audio is never uploaded or stored — the server only
   sees the transcript. Each spoken answer is sent to
   `POST /api/mock-interviews/[id]/turn`, which asks the AI provider for a
   single structured move and persists both sides of the exchange.
8. **Debriefs come from stored transcripts only (Phase 4).** When a mock ends
   (or on demand), `POST /api/mock-interviews/[id]/debrief` assembles a
   budget-capped transcript (`src/lib/debrief.ts`), asks the AI provider for a
   structured 6-dimension debrief (Zod-validated, deterministic fallback), and
   persists `overallScore` + `debrief` on the session. Scores are explicitly
   session-level practice feedback — never employability claims. History
   lives at `/history` and `/history/[id]` with re-practice and delete.

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
| Mock interview | `src/app/(focus)/mock/[id]/page.tsx` + `mock-interview.tsx` |
| Mock history | `src/app/(app)/history/page.tsx` + `history/[id]/page.tsx` + `debrief-view.tsx`, `debrief-panel.tsx` |
| FAQ | `src/app/(app)/faq/page.tsx` |
| Settings | `src/app/(app)/settings/page.tsx` |
| Mock API | `src/app/api/mock-interviews/**` (create/active, turn, end, detail, debrief, history, delete) |
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

## Mock interview (Phase 3)

A mock session rehearses an existing generated interview. The screen is a
focused, shell-less route (`(focus)` group — still auth-guarded) so nothing
distracts during practice.

- **Preflight** explains permissions and only calls `getUserMedia` after the
  user clicks Start. Mic denial blocks voice mode with a real error + retry;
  camera denial continues voice-only. Media tracks stop on end/unmount.
- **Live loop**: interviewer text → TTS → STT listening (live interim) → the
  candidate's transcript is posted to the turn API → the server returns the
  next structured move → repeat. No speech is heard → try-again or type-answer
  fallbacks. Mute and camera toggles are local only.
- **Server state**: `mock_interview_sessions` + `interview_turns` (see
  DATABASE.md). Unfinished sessions can be resumed from the last AI question;
  every mock ends in `SESSION_COMPLETE`. Debrief/overall score are Phase 4.

## Client/server split

- **Server components**: landing, auth pages, dashboard, lists, workspace
  hydration, mock page shell, FAQ (they own auth + DB reads).
- **Client components**: auth forms, create-interview form, streaming
  generation panel, interview workspace (tabs, reveal/hide, practice,
  evaluation, keyboard nav), mock interview screen, session delete menu.
- **Server actions**: `signupAction`, `loginAction`, `logoutAction`,
  `updateProfileAction`, `changePasswordAction`.
- **Route handlers**: data API + AI endpoints (see API.md).

## Environment

See `.env.example`. `DATABASE_URL` is the Postgres connection string (Neon
pooled URL in production), `AUTH_SECRET` signs session cookies,
`OPENROUTER_API_KEY` enables live AI (optional — the deterministic fallback
keeps the flow working without it). All keys are server-side only.

## Future modules (extension points)

Remaining Phase 2 items (answer-reactive written follow-ups, DOCX resumes) and
Phase 5 polish (a11y, rate limiting, security headers, tests, seed script) are
planned (see ROADMAP.md). Cloud STT/TTS can swap in behind `src/lib/speech.ts`
without touching the UI. Extending the model means adding tables + owner-scoped
services under `src/lib/`, route groups per module, and sidebar entries —
nothing about the current data flow needs to change shape.
