# InterviewOS

> Practice your interview before the real one.

InterviewOS is an AI-powered interview practice platform. Tell it about the job
you're targeting — role, experience level, company, company type, interview
type and the job description — and optionally add your resume, public GitHub
profile and projects. It generates a realistic, personalized question set and
offers two practice modes: **written practice** with specific AI feedback on
every answer, and an **AI mock interview** where you practice aloud with an AI
interviewer that asks live follow-ups (mic + optional private camera view).

This build covers **Phases 1–5** of the V1 roadmap: the InterviewOS setup
model, candidate context (resume/GitHub/projects), the question engine,
written practice, the AI mock interview, and the mock **debrief + history**
(scored 6-dimension feedback from your spoken answers, saved sessions,
re-practice, delete) — plus the Phase 5 polish: accessibility, rate limiting,
security headers, and automated tests (see [ROADMAP.md](./ROADMAP.md)).

## Stack

- **Next.js 16** (App Router, React 19, TypeScript) — pages + API routes
- **Tailwind CSS v4** + hand-rolled UI primitives + Lucide icons
- **Prisma ORM** on **PostgreSQL** (Neon serverless Postgres — works on Vercel and locally)
- **Auth**: email + password (bcrypt), signed httpOnly session cookies (jose)
- **AI**: OpenRouter with a provider abstraction and a deterministic offline fallback
- **Resume parsing**: pdfjs-dist (server-side PDF text extraction; facts are structured by the AI provider)
- **Mock interview voice**: browser-native (Web Speech API STT + speechSynthesis TTS + getUserMedia) through a swappable speech layer — no API keys, audio never stored

## Getting started

```bash
npm install
cp .env.example .env        # then fill in values
npx prisma migrate dev      # applies migrations to the Postgres DB in DATABASE_URL
npm run dev                 # http://localhost:3000
```

Required in `.env`:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (e.g. Neon `-pooler` URL) |
| `AUTH_SECRET` | random string signing session cookies |
| `OPENROUTER_API_KEY` | enables live AI generation/evaluation |

These are validated at startup (`src/lib/env.ts`, invoked from
`src/instrumentation.ts`) before the server accepts traffic: a missing or blank
required variable fails the boot with a message naming it — instead of a 500 on
the first request. `DATABASE_URL` and `AUTH_SECRET` are always required;
`OPENROUTER_API_KEY` is required in production, so a deploy can never silently
serve the offline question bank.

In development OpenRouter is optional, and at runtime a failed AI call always
falls back to the built-in deterministic question bank and evaluator so every
screen still works. The UI tells you when the fallback is active.

Create an account at `/signup` to start.

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Landing page |
| `/signup`, `/login` | Auth (server actions + session cookie; protected routes are gated at the edge by `src/proxy.ts` and support `?next=` redirects) |
| `/dashboard` | Greeting, score trend across mock interviews, recent interviews (real data) |
| `/interviews` | My Interviews (cards, progress, practice-again, delete; 10 per page) |
| `/interviews/new` | Interview setup → streams AI generation (`?from=<sessionId>` prefills it) |
| `/interviews/[id]` | Practice workspace (questions, follow-ups, answers, evaluation) |
| `/mock/[id]` | AI Mock Interview (preflight → live spoken interview → debrief) |
| `/history` | Mock history — every spoken session, scores, re-practice, delete (10 per page) |
| `/history/[id]` | Full debrief (6-dimension breakdown, strengths/weaknesses, transcript) |
| `/faq` | Frequently asked questions |
| `/settings` | Profile name + password |

`GET /api/health` reports whether the app can reach its database — the quickest
way to confirm a fresh Vercel deploy is actually wired up (`200` healthy,
`503` with the reason in the server logs).

## Workflow

```text
Open app → Create account / Log in
  → Dashboard → "+ New Interview" (or "Practice again with this setup" on a
    card in My Interviews / a saved debrief, which reopens the form pre-filled
    with that role, company and job description)
    → target job: Company / Company type · Job role (required) ·
      Experience level (required) · Interview type · Job description · 10/15/20 questions
    → "Generate Interview" (streams: Analyzing role → Questions → Follow-ups → Saving)
  → Workspace: question list on the left, detail on the right
    → pick a question → read "Why this question matters"
    → reveal the suggested answer when ready → practice written answers with a
      live word count (and estimated spoken length) and an optional per-question
      timer against the 2-minute answer target
    → follow-up chips probe deeper
    → submit → score + strengths / missing / improvements
  → Progress bar tracks practiced/total per interview
  → /interviews lists sessions with progress; delete via the ⋯ menu

AI Mock Interview (from any interview card or the workspace header):

```text
Practice aloud → preflight (mic + optional camera self-view, permission copy)
  → Start → AI interviewer speaks the first question (TTS)
  → answer aloud → live transcript → interviewer reacts with follow-ups / new questions
  → End → completion screen auto-generates your debrief (6-dimension score,
    strengths/weaknesses, recommended practice) → full debrief + transcript
    saved to /history for re-practice or delete
```

## Useful commands

```bash
npm run dev       # dev server on :3000
npm run build     # production build
npm run lint      # eslint
npm test          # unit tests (node:test + tsx)
npm run db:seed   # idempotent demo account + sample interview
npx tsc --noEmit  # typecheck
npx prisma studio # inspect the local database
curl -i localhost:3000/api/health   # is the database reachable?
```

Optional AI cost control: set `OPENROUTER_CHEAP_MODEL` to route resume
parsing / answer evaluation / follow-up generation through a cheaper model
than `OPENROUTER_MODEL`. AI/expensive endpoints are rate-limited per user
(see `src/lib/rate-limit.ts`); exceeding a limit returns `429` with
`Retry-After` — the debrief UI counts the cooldown down for you. Login and
signup use a separate per-IP limiter (`src/lib/auth-rate-limit.ts`) so
brute-force attempts can't consume the AI budget.

## Docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) — structure, data flow, AI pipeline
- [DATABASE.md](./DATABASE.md) — schema and ownership rules
- [API.md](./API.md) — HTTP endpoints
- [ROADMAP.md](./ROADMAP.md) — phase plan for V1
- `.env.example` — environment template
