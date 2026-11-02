# Contributing to InterviewOS

Thanks for taking a look at InterviewOS. This doc covers how to get set up and
how changes get made.

## Setup

```bash
git clone https://github.com/smoin7157-gif/interviewpilot.git
cd interviewpilot
npm install
cp .env.example .env   # fill in DATABASE_URL, AUTH_SECRET, OPENROUTER_API_KEY
npx prisma migrate dev
npm run dev            # http://localhost:3000
```

## Before you start

- Read `ARCHITECTURE.md` for how the app is structured — especially the AI
  provider abstraction and the ownership-scoping pattern. Any new DB query must
  filter by the authenticated user, matching `src/lib/data.ts`.
- Check `ROADMAP.md` so you're not duplicating work, and `AGENTS.md` for the
  Next.js version rules this repo follows.
- `DATABASE_URL` and `AUTH_SECRET` are validated at startup, so a missing
  variable fails the boot with a message naming it (see `src/lib/env.ts`).
  `OPENROUTER_API_KEY` is optional locally: without it the deterministic
  provider keeps every screen working.

## Making a change

1. Create a branch off `main`: `git checkout -b fix/short-description`
2. Make the change, keeping it scoped to one concern per branch/commit.
3. Run before committing:
   ```bash
   npm run lint
   npx tsc --noEmit
   npm test
   ```
   These are the same checks CI runs on every push and pull request, all
   offline — no database or API key is needed.
4. Commit with a clear message describing *what* changed and *why*:
   ```bash
   git add -A
   git commit -m "Fix draft answers not saving on tab close"
   ```
5. Push and open a pull request into `main`.

## Code conventions

- TypeScript, strict where possible — avoid `any`, especially in
  `src/lib/ai/service.ts` and `src/lib/data.ts`.
- UI: use the existing primitives in `src/components/ui/` rather than one-off
  styled elements. Keep to the indigo/zinc theme.
- All AI and DB calls stay server-side (server actions or route handlers) —
  never call OpenRouter or Prisma from a client component.
- Every new AI-facing or DB-heavy route should sit behind the existing rate
  limiter (`src/lib/rate-limit.ts`).
- Never invent data or report success you didn't achieve: AI failures fall back
  or surface a real error, and nothing is fabricated to fill a screen.

## Testing

Unit tests live in `tests/` and run with Node's test runner through `tsx`:

```bash
npm test
```

Add a test for any new server action or scoring/generation logic — these are
the highest-risk areas for silent regressions. Pure helpers (validation, the
fallback provider, pagination, stats, the JD dataset) are the easiest to cover.

## Reporting issues

Open a GitHub issue with:

- What you expected to happen
- What actually happened
- Steps to reproduce (and whether it happens with the deterministic AI
  fallback too, or only with a live OpenRouter key)
