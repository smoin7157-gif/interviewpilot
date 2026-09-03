# InterviewPilot

> Practice smarter. Walk into every interview prepared.

InterviewPilot is an AI interview-practice MVP. Pick a job role, generate a
realistic set of interview questions, practice your answer, reveal a suggested
answer, dig into follow-ups, and get specific AI feedback on the answer you
actually wrote.

This repository currently contains the **MVP scope only** — interview question
practice. Future InterviewOS modules (resume intelligence, roadmap, mock
interviews, etc.) are intentionally not built, but the architecture keeps room
for them.

## Stack

- **Next.js 16** (App Router, React 19, TypeScript) — pages + API routes
- **Tailwind CSS v4** + hand-rolled shadcn-style UI primitives + Lucide icons
- **Prisma ORM** on **SQLite** (`prisma/dev.db`) — schema is portable to Postgres/Supabase
- **Auth**: email + password (bcrypt), signed httpOnly session cookies (jose)
- **AI**: OpenRouter (`openai/gpt-4o-mini` by default) with a provider
  abstraction and a deterministic offline fallback

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

### Test accounts

You can sign up in the UI, or use the pre-seeded demo account:

```text
email:    demo@interviewpilot.dev
password: password123
```

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Landing page |
| `/signup`, `/login` | Basic auth |
| `/dashboard` | Greeting + recent interviews |
| `/interviews` | My Interviews (cards, progress, delete) |
| `/interviews/new` | Create interview → streams AI generation |
| `/interviews/[id]` | Practice workspace (questions, follow-ups, answers, evaluation) |
| `/settings` | Name + password |

## Workflow (how a user flows through the product)

```text
Open app → Create account / Log in
  → Dashboard → "+ New Interview"
    → enter Job Role + Experience Level (+ optional Company / Job Description / 10-15-20 questions)
    → "Generate Interview" (streams: Analyzing role → Questions → Follow-ups → Saving)
  → Workspace: question list on the left, detail on the right
    → pick a question → read "Why this question matters"
    → think → "See Answer" to reveal the suggested answer
    → "Follow Up" tab / follow-up chips for deeper questions
    → "Practice Answer" → type → "Evaluate My Answer" → score + strengths/missing/improvements
    → ← / → or arrow keys move through questions; Skip is available
  → Progress bar tracks practiced/total per interview
  → Leave and come back later: /interviews shows your sessions with progress
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

## Scripts / utilities

- `prisma/migrations/` — schema migrations
- `src/lib/ai/` — provider abstraction (OpenRouter + fallback), prompts, strict output validation
- `src/lib/auth.ts` — sessions, password hashing
- `src/lib/data.ts` — ownership-scoped queries
