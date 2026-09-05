# InterviewOS

> Practice your interview before the real one.

InterviewOS is an AI-powered interview practice platform. Tell it about the job
you're targeting — role, experience level, company, company type, interview
type and the job description — and optionally add your resume, public GitHub
profile and projects. It generates a realistic, personalized question set and
offers two practice modes: **written practice** with specific AI feedback on
every answer, and an **AI mock interview** where you practice aloud with an AI
interviewer that asks live follow-ups (mic + optional private camera view).

This build covers **Phases 1–3** of the V1 roadmap: the InterviewOS setup
model, candidate context (resume/GitHub/projects), the question engine,
written practice, and the AI mock interview. Debriefs and history polish are
planned next (see [ROADMAP.md](./ROADMAP.md)).

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

OpenRouter is optional at runtime: without a key (or if a call fails) the app
gracefully falls back to a built-in, deterministic question bank and evaluator
so every screen still works. The UI tells you when the fallback is active.

Create an account at `/signup` to start.

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Landing page |
| `/signup`, `/login` | Auth (server actions + session cookie) |
| `/dashboard` | Greeting + recent interviews (real data) |
| `/interviews` | My Interviews (cards, progress, delete) |
| `/interviews/new` | Interview setup → streams AI generation |
| `/interviews/[id]` | Practice workspace (questions, follow-ups, answers, evaluation) |
| `/mock/[id]` | AI Mock Interview (preflight → live spoken interview) |
| `/faq` | Frequently asked questions |
| `/settings` | Profile name + password |

## Workflow

```text
Open app → Create account / Log in
  → Dashboard → "+ New Interview"
    → target job: Company / Company type · Job role (required) ·
      Experience level (required) · Interview type · Job description · 10/15/20 questions
    → "Generate Interview" (streams: Analyzing role → Questions → Follow-ups → Saving)
  → Workspace: question list on the left, detail on the right
    → pick a question → read "Why this question matters"
    → reveal the suggested answer when ready → practice written answers
    → follow-up chips probe deeper
    → submit → score + strengths / missing / improvements
  → Progress bar tracks practiced/total per interview
  → /interviews lists sessions with progress; delete via the ⋯ menu

AI Mock Interview (from any interview card or the workspace header):

```text
Practice aloud → preflight (mic + optional camera self-view, permission copy)
  → Start → AI interviewer speaks the first question (TTS)
  → answer aloud → live transcript → interviewer reacts with follow-ups / new questions
  → End → completion screen with your session transcript (debrief comes in Phase 4)
```

## Useful commands

```bash
npm run dev       # dev server on :3000
npm run build     # production build
npm run lint      # eslint
npx tsc --noEmit  # typecheck
npx prisma studio # inspect the local database
```

## Docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) — structure, data flow, AI pipeline
- [DATABASE.md](./DATABASE.md) — schema and ownership rules
- [API.md](./API.md) — HTTP endpoints
- [ROADMAP.md](./ROADMAP.md) — phase plan for V1
- `.env.example` — environment template
