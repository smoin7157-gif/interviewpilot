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
  ├── instrumentation.ts → startup env validation (fails the boot, skipped at build)
  ├── (app)   → protected pages (dashboard, interviews, workspace, faq, settings)
  ├── (focus) → protected, shell-less pages (AI mock interview screen)
  ├── (auth)  → /login /signup (server actions)
  └── /api    → route handlers (interviews CRUD, generate, evaluate, mock, health …)
        │
        ▼
   lib/
  ├── auth.ts                session cookie (jose HS256) + bcrypt
  ├── env.ts                 startup env contract (zod) + fail-fast assertion
  ├── data.ts                ownership-scoped Prisma queries
  ├── pagination.ts          shared keyset pagination (cursor slices + list URLs)
  ├── mock.ts                mock-interview queries + interviewer context builder + history rows
  ├── debrief.ts             debrief context assembly + transcript budget (Phase 4)
  ├── validation.ts          zod schemas (shared by UI + API)
  ├── candidate-context.ts   normalized candidate-context types + summary
  ├── resume.ts              PDF → text extraction
  ├── github.ts              public GitHub profile analysis
  ├── speech.ts              client-only replaceable speech layer (STT/TTS/media)
  ├── ai/
  │   ├── service.ts     facade: pick provider, retry, graceful fallback
  │   ├── openrouter.ts  OpenRouter chat-completions provider (+ interviewer)
  │   ├── fallback.ts    deterministic offline provider (+ interviewer + resume)
  │   ├── prompts.ts     system/user prompt builders
  │   └── validate.ts    tolerant JSON extraction + strict validation
  └── jd/                    offline job-description seed dataset (build-time)
      ├── schema.ts          shared Zod schema + seniority/company vocabularies
      ├── roles.ts           29-role catalog: stack, themes, focus areas
      ├── compose.ts         deterministic offline composer (no API key)
      ├── openrouter-batch.ts batched LLM generator (better wording)
      └── dedupe.ts          token-overlap near-duplicate removal
```

## Job description seed dataset (techjd)

`prisma/seed-data/job-descriptions.json` is a generated, validated dataset of
**1,282 original job descriptions** — every 29-role × 3-seniority × 3-company-
type combination, five variants each, minus what the dedupe pass collapsed. It
exists so the *offline* side of the product has real, role-specific JD material
instead of a handful of generic templates. Nothing is scraped or copied: every
entry is composed from `src/lib/jd/roles.ts`, a distilled catalog of how each
role is practised.

```
scripts/generate-job-descriptions.ts
  catalog → for each combination: batch of 5 → provider → zod validation (retry)
          → running checkpoint → token-overlap dedupe → job-descriptions.json
```

Two interchangeable backends produce the same shape, so the pipeline can always
finish:

- **`openrouter`** — one batched chat completion per combination, with the
  catalog injected as grounding (`OPENROUTER_API_KEY` required).
- **`local`** — `src/lib/jd/compose.ts`, a deterministic composer that assembles
  original sentences from the catalog plus seniority/company-type modifiers.
  No key, no network, ~6 seconds for the whole dataset.

`--provider=auto` (default) picks OpenRouter when a key is set, else local. Runs
checkpoint per combination, so a run that dies mid-way resumes instead of
starting over; the checkpoint and run logs are git-ignored because the JSON is
the artifact. `npm test` covers the dataset (schema validity, full coverage, ≥3
variants per combination, derived `yearsExperience`, no soft-skill
"technologies", re-dedupe is a no-op) and the composer's variation guarantees.

**Planned (not wired into the app yet):** a compact cached index over this JSON
and JD-grounded *fallback* questions — the live OpenRouter question path is
deliberately untouched, so this data cannot regress production generation until
that step lands deliberately.

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
   generated up-front with each question and served from the DB. Written
   answers are autosaved into `interview_questions.draftAnswer` ~2.5s behind the
   last keystroke (server action) and flushed on tab-hide/unload/unmount; a
   `localStorage` buffer holds only text no save has confirmed yet, so it can't
   shadow newer server state.
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
9. **Environment is validated before the server serves traffic.**
   `src/instrumentation.ts` runs `assertEnv()` (`src/lib/env.ts`, zod) once per
   server instance, before the instance accepts requests. Vercel bakes env
   vars into a deployment at build time, so a variable that is missing — or
   present but blank — otherwise only shows up as a 500 on whichever request
   touches it first; the check names every offending variable instead.
   `DATABASE_URL` and `AUTH_SECRET` are always required, `OPENROUTER_API_KEY`
   in production only (in development its absence just selects the deterministic
   provider, so it is a warning). The build phase is skipped deliberately:
   `next build` collects page data without runtime env vars, and a boot check
   must never fail a build. Diagnostics describe a value's shape (set? blank?
   right protocol?) and never its content.
10. **Edge auth gate before render.** `src/proxy.ts` (Next.js 16 proxy, the
   successor to middleware) validates the session cookie at the edge and
   redirects unauthenticated users to `/login?next=…` before any server
   component or DB query runs — protected pages never pay render-then-redirect
   latency. `loginAction`/`signupAction` honor the sanitized `next` param so
   users land where they were headed; `src/lib/utils.ts` `sanitizeRedirect`
   only allows same-origin relative paths.

## Routing map

| Area | Files |
| --- | --- |
| Landing | `src/app/page.tsx` |
| Health | `src/app/api/health/route.ts` (DB round-trip; 200/503) |
| Auth | `src/app/(auth)/*`, `src/lib/auth-actions.ts`, `src/proxy.ts` (edge gate) |
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

**Accuracy hardening.** The generation prompt carries a quality contract
(distinct topics only, one idea per question, aloud-answerable, 3
non-overlapping follow-ups), and `parseQuestions` enforces it server-side:
near-duplicate rephrases are dropped via token-overlap fingerprints and
`source_context` tags are normalized onto the documented vocabulary. The
evaluation prompt anchors scores to a 5-band rubric and runs at low
temperature (0.2) so the same answer scores consistently; debriefs run at
0.3. The live interviewer prompt bounds follow-up pacing (one probe per
question) and forbids repeating bank questions. The deterministic fallback
mirrors all of this: its bank covers every category (including coding,
system_design, data_ml, job_description), selection honors the seniority
difficulty mix via quotas and the interview type via category emphasis, and
its driver asks at most one stored follow-up per question.

**Cross-session variation.** Every generation request carries an avoid-list
of the user's most recent 200 generated questions (`listGeneratedQuestions`).
The prompt treats them as covered ground; `filterAvoidList` enforces it
server-side on the OpenRouter path; the fallback's template selector skips
avoided templates while keeping its seniority quotas, relaxing only when the
bank is exhausted. Repeat sessions for the same role surface fresh questions
instead of rephrases.

**Reliability of the live path.** `chatCompletion` caps `max_tokens` at 16k
(within every supported model's output limit — a larger request makes
OpenRouter reject the call and silently degrade to fallback), and the service
layer retries transient failures (429/5xx/timeout/network) once with backoff
via `withRetry` before degrading to the deterministic provider.

## Mock interview (Phase 3)

A mock session rehearses an existing generated interview. The screen is a
focused, shell-less route (`(focus)` group — still auth-guarded) so nothing
distracts during practice.

- **Preflight** explains permissions and only calls `getUserMedia` after the
  user clicks Start. Mic denial blocks voice mode with a real error plus both
  a retry and a "practice by typing" path; a browser without the Web Speech
  API is detected up front (no mic required) and drops straight into typed
  mode. Camera denial continues voice-only. Media tracks stop on end/unmount.
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
  `updateProfileAction`, `changePasswordAction` (`src/lib/auth-actions.ts`),
  plus `saveAnswerDraftAction` (`src/lib/draft-actions.ts`) for written-practice
  autosave — ownership-scoped in `data.ts`, no `revalidatePath` (an autosave
  must not re-render the workspace mid-typing).
- **Route handlers**: data API + AI endpoints (see API.md).

## Environment

See `.env.example`. `DATABASE_URL` is the Postgres connection string (Neon
pooled URL in production), `AUTH_SECRET` signs session cookies,
`OPENROUTER_API_KEY` enables live AI (required in production; optional in
development, where the deterministic fallback keeps the flow working without
it). `OPENROUTER_CHEAP_MODEL` optionally routes bulk extraction tasks (resume
parsing, evaluation, follow-ups) to a cheaper model. All keys are server-side
only.

All of the above are checked once at startup (`src/lib/env.ts` via
`src/instrumentation.ts`) and again lazily by `src/lib/db.ts` on the first query,
so a misconfigured deployment fails with the variable's name rather than with a
blank page. `GET /api/health` answers `200` only when the database responds,
which is the fastest way to confirm a fresh deploy is wired up.

## Security & abuse controls (Phase 5)

- **Rate limiting** (`src/lib/rate-limit.ts`): in-memory sliding-window
  limiter keyed per user on every AI/expensive endpoint; `429` +
  `Retry-After` on exceed. Auth entry points (`/login`, `/signup`) use a
  **dedicated** limiter (`src/lib/auth-rate-limit.ts`) with its own buckets, so
  brute-force traffic can never consume the AI budget and a hot AI session can
  never lock a user out. Best-effort per serverless instance by design.
- **Destructive-action safety**: deletes (interview, mock session) and ending a
  live mock go through the shared `Dialog`/`ConfirmDialog` primitive
  (`src/components/ui/dialog.tsx`) instead of `window.confirm`, and every async
  action button carries a synchronous in-flight ref guard plus a loading
  spinner, so a double-click can't fire duplicate requests.
- **Upload validation** (`src/lib/file-check.ts`): PDF magic-byte check
  (`%PDF-`), size cap, filename sanitization — extension/MIME alone are
  never trusted.
- **Safe errors**: parser/network internals are logged server-side, users
  get generic messages.
- **Response headers** (`next.config.ts`): nosniff, frame denial, referrer
  policy, camera/mic-only permissions policy.
- **Cost controls**: per-task `max_tokens`, debrief transcript capped at 30k
  chars, interviewer context summarized to the last 10 turns.
- **Tests**: `npm test` (node:test + tsx) covers validation schemas, file
  checks, the rate limiter, utils, the fallback AI provider, and the JD seed
dataset + composer.
- **Seed**: `npm run db:seed` provisions an idempotent demo account.
- **Client resilience**: the dark `(focus)` route group has its own error
  boundary (interviewer crashes mid-session recover in place), and the history
  debrief panel honors the rate limiter's `Retry-After` with a visible
  countdown instead of a generic error.

## Future modules (extension points)

Remaining Phase 2 items (answer-reactive written follow-ups, DOCX resumes)
are planned (see ROADMAP.md). Cloud STT/TTS can swap in behind `src/lib/speech.ts`
without touching the UI. Extending the model means adding tables + owner-scoped
services under `src/lib/`, route groups per module, and sidebar entries —
nothing about the current data flow needs to change shape.
