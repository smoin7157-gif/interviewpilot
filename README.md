# InterviewOS

> Practice your interview before the real one.

InterviewOS is an AI-powered interview practice platform. Tell it about the job
you're targeting — role, experience level, company, company type, interview
type and the job description — and it generates a realistic question set,
then gives you written practice with specific AI feedback on every answer you
write.

This build is the **V1 foundation**: a working written-practice loop with the
InterviewOS setup model, docs, and roadmap in place. AI Mock Interviews,
resume/GitHub/project context and debriefs are planned next (see
[ROADMAP.md](./ROADMAP.md)).

## Stack

- **Next.js 16** (App Router, React 19, TypeScript) — pages + API routes
- **Tailwind CSS v4** + hand-rolled UI primitives + Lucide icons
- **Prisma ORM** on **SQLite** (`prisma/dev.db`) — schema is portable to Postgres/Supabase
- **Auth**: email + password (bcrypt), signed httpOnly session cookies (jose)
- **AI**: OpenRouter with a provider abstraction and a deterministic offline fallback

## Getting started

```bash
npm install
cp .env.example .env        # then fill in values
npx prisma migrate dev      # creates prisma/dev.db
npm run dev                 # http://localhost:3000
```

Required in `.env`:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | `file:./dev.db` (SQLite) |
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
