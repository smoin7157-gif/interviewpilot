# InterviewOS — Roadmap (V1)

**Most important rule:** Reliable → Useful → Polished → Intelligent, in that
order. Preserve working code; if an AI integration fails, show a real
error/fallback — never fabricate success.

Status legend: ✅ shipped · 🟡 in progress · ⬜ planned

## Phase 1 — Foundation 🟡 (this build)

- ✅ Inspect repository + running app
- ✅ Documentation (`ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `README.md`, `.env.example`)
- ✅ Authentication: sign up, login, logout, protected routes, profile/settings
- ✅ Database: SQLite/Prisma schema + migrations, ownership scoping
- ✅ Navigation shell + dashboard (real data only)
- ✅ Interview creation: company, company type, job role, experience level,
  interview type, job description, question count (10/15/20) — all persisted
- ✅ InterviewOS brand/identity pass (wordmark, metadata, copy)
- ✅ Seed script (`prisma/seed.ts`, `npm run db:seed`) + automated test
  suite (`npm test`, 137 tests — validation, file safety, rate limiter,
  utils, fallback AI provider, JD seed dataset)

## Phase 2 — Written practice + candidate context 🟡

✅ Shipped in this build:
- Candidate context inputs: **resume upload (PDF) + server-side parse**
  (skills/experience/education/projects/achievements/certs/technologies —
  live AI extraction with deterministic fallback; never invents facts),
  **GitHub URL validation + public repo retrieval** (no auth, no private
  repos, rate-limit-aware), **manual projects** (name, repo URL, description,
  tech stack, contribution) → `candidate_projects` table
- Normalized candidate-context summary (`buildCandidateContextSummary`);
  resume/GitHub/projects flow into question generation only as facts
- Question engine v2: InterviewOS categories (technical, behavioral, project,
  job_description, coding, system_design, data_ml, company, general),
  easy/medium/hard, per-interview-type distributions, per-question
  `source_context`, contextual probing of the candidate's real claims
- Question list/detail, suggested answers, typed answers, AI evaluation,
  follow-ups, history (shipped in earlier builds, now on the new schema)

⬜ Remaining in Phase 2:
- Follow-up engine reacting to the candidate's actual answer (not
  pre-generated picks) — dynamic follow-up on evaluation
- DOCX resume support if clean; GitHub repo README/metadata depth

## Phase 3 — AI Mock Interview ✅ (this build)

- Preflight screen at `/mock/{interviewId}`: context summary (role/company/
  level/type), mic status, optional camera self-view checkbox, headphones +
  privacy notes. Permissions are requested only after the user presses Start.
- Mic required (permission denied → real error + retry; never start voice
  without it), camera optional with voice-only fallback + notice. Tracks stop
  when the session ends or the screen unmounts.
- Replaceable speech layer (`src/lib/speech.ts`): browser STT (Web Speech
  API), TTS (speechSynthesis), media helpers — no API keys, no server-side
  audio. A cloud provider can swap in without touching the interview UI.
- AI interviewer (server-side, same provider abstraction): structured
  actions `ask_question | ask_followup | move_topic | end_interview` with
  zod validation, deterministic fallback interviewer, and a hard question cap
  — uses the session's prepared question bank + candidate context, probes the
  candidate's actual answers, one spoken question at a time.
- Live screen: current question bubble, live STT interim caption, listening /
  thinking / speaking states, mute + camera toggles, Done/try-again and
  type-answer fallbacks when no speech is heard, End + confirm.
- Session state machine on DB (`SESSION_STARTED` → `QUESTION_COMPLETE` →
  `SESSION_COMPLETE`), transcripts persisted in `interview_turns` (no raw
  audio/video stored), unfinished sessions resume from where they stopped.
- Entry points: “Practice aloud” on each interview card and in the workspace
  header; completion screen with transcript.

Remaining in Phase 3 (roadmap notes):
- Cloud STT/TTS provider option behind the speech interface (browser voice is
  default; Chrome/Edge recommended)
- Device picker for multiple mics/cameras; answer-reactive difficulty already
  partial via the interviewer prompt


## Phase 4 — Debrief & History ✅ (this build)

- Debrief generated from the stored mock transcript
  (`mock_interview_sessions.debrief`, `interview_turns`) via the same
  provider abstraction — OpenRouter LLM with a deterministic offline
  fallback. Output: overall score + 6-dimension breakdown (technical,
  communication, structure, relevance, project knowledge, problem solving),
  strengths/weaknesses, missed opportunities, strongest/weakest answers,
  recommended practice. Zod-validated; transcript budget-capped for cost.
- Auto-generated on the mock completion screen (`/mock/[id]`) and available
  on demand at `POST /api/mock-interviews/:id/debrief` (idempotent, `force`
  to regenerate). Requires ≥ 2 spoken answers.
- Session-level practice scores only — no "employability" claims, no
  emotion/eye-tracking claims; the UI says so explicitly.
- History: `/history` (all sessions, scores, re-practice, delete),
  `/history/[id]` (full debrief + transcript), `GET
  /api/mock-interviews/history`, `DELETE /api/mock-interviews/:id`,
  dashboard "Recent Mock Interviews" strip.
- ✅ Debrief + transcript export: copy as Markdown or download a `.md` file
  from the completion screen and `/history/[id]`
  (`src/lib/debrief-export.ts` + the shared `DebriefExport` component;
  transcript-only when no debrief exists yet).

## Phase 5 — Polish ✅ (this build)

- **Accessibility:** skip-to-content link, focusable main anchors across
  layouts, mobile drawer closes on Escape, visible focus rings, aria-live
  interviewer status, reduced-motion CSS
- **Security:** security response headers (nosniff / frame denial / referrer /
  permissions policy), PDF magic-byte validation on resume upload,
  filename sanitization, safe error messages (no parser/network internals
  leaked to users)
- **Rate limiting:** per-user sliding-window limits on all AI/expensive
  endpoints (generation 10/h, resume 10/h, github 20/h, evaluation 60/h,
  practice 60/h, mock create 20/h, mock turns 200/h, debrief 15/h) → 429 +
  Retry-After; plus a **separate per-IP auth limiter** for `/login` (10/15 min)
  and `/signup` (10/h) so brute-force attempts can't burn the AI budget
- **Performance/cost:** cheap model routing for extraction tasks
  (`OPENROUTER_CHEAP_MODEL`), debrief transcript budget-capped at 30k
  chars, interviewer context already summarized to the last 10 turns
- **Tests:** `npm test` — 137 unit tests (validation schemas, file-check,
  rate limiter, utils, fallback AI provider, JD seed dataset)
- **Seed:** `npm run db:seed` — atomic, idempotent demo account + sample
  interview (verified against Neon)
- **Deployment:** Prisma client generation fixed for Vercel builds
  (`postinstall` + `prisma generate` in `build`)

## Phase 6 — Offline question-bank enrichment 🟡

Targeting the "Reliable → Useful" edge: the deterministic fallback should ask
about the actual role, not a fixed bank of generic templates.

- ✅ 29-role JD catalog (`src/lib/jd/roles.ts`), shared Zod schema
  (`src/lib/jd/schema.ts`), token-overlap dedupe (`src/lib/jd/dedupe.ts`)
- ✅ Batched LLM generator with catalog grounding, resumable checkpointing and
  per-combination retries (`scripts/generate-job-descriptions.ts`)
- ✅ **Deterministic offline composer** (`src/lib/jd/compose.ts`) +
  `--provider=local|auto|openrouter`, so the dataset can always be rebuilt
  without an API key or credits
- ✅ **1,282-entry validated dataset** committed at
  `prisma/seed-data/job-descriptions.json`, guarded by `tests/jd-seed.test.ts`
  (schema validity, full combination coverage, ≥3 variants each, re-dedupe is a
  no-op)

- ✅ `src/lib/jd/index.ts` — compact, lazy, cached index over the dataset
  (role/seniority keyed) with fuzzy role resolution and experience-level /
  company-type mapping; degrades to an empty index if the seed file is missing,
  so lookups stay DB-free and the fallback still works
- ✅ JD-grounded fallback questions (`src/lib/ai/jd-questions.ts`) wired into
  `FallbackProvider` *additively*: matched seed JDs rewrite the selected
  templates' wording (skills, responsibilities, interview focus areas) while the
  template keeps its category and difficulty — the seniority mix, interview-type
  emphasis, template bank and cross-session avoid-list all stay unchanged, and
  the live OpenRouter path is untouched

⬜ Remaining in Phase 6:
- `job_description_templates` Prisma table + `npm run seed:jds:load` so the set
  is also queryable/versionable server-side (needs a migration)

## Explicitly out of scope (do not build)

Real-interview copilot, stealth assistance, screen capture, employer tools,
job scraping/tracking, ATS optimizer, payments, enterprise dashboards, coding
sandbox, system-design whiteboard, CV/emotion/eye-tracking claims, mobile app,
unnecessary multi-agent/RAG architectures. Leave clean extension points only.
