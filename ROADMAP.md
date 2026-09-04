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
- 🟡 InterviewOS brand/identity pass (wordmark, metadata, copy)
- ⬜ Seed script + minimal automated tests for the Phase 1 flows

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
- Seed script + automated tests for setup → generate → practice flows

## Phase 3 — AI Mock Interview ⬜

- Preflight: mic/camera permission flow (granted only after user starts),
  self-view camera, device checks, permission errors + retry, voice-only
  fallback
- Browser media API, tracks stopped on end, no hidden capture
- Session state machine (`SESSION_STARTED` → `AI_SPEAKING` →
  `LISTENING` → `PROCESSING_ANSWER` → `GENERATING_FOLLOWUP` →
  `QUESTION_COMPLETE` … `SESSION_COMPLETE` / `ERROR`), no overlapping turns
- STT + AI interviewer (structured action output: ask_question / ask_followup /
  move_topic / end_interview) + TTS — provider-replaceable
- DB: `mock_interview_sessions`, `interview_turns`

## Phase 4 — Debrief & History ⬜

- Transcript, overall score + breakdown (technical, communication, structure,
  relevance, project knowledge, problem solving), strengths/weaknesses,
  missed opportunities, strongest/weakest answers, recommended practice
- Session-level AI practice scores only — no fake "employability" claims; no
  emotion/eye-tracking claims
- History: saved sessions, debriefs, re-practice, delete

## Phase 5 — Polish ⬜

- Responsive/accessibility pass, performance + cost control (context
  summarization, cheap models for extraction, token limits), security audit
  (file validation, rate limiting, safe errors), tests, deployment

## Explicitly out of scope (do not build)

Real-interview copilot, stealth assistance, screen capture, employer tools,
job scraping/tracking, ATS optimizer, payments, enterprise dashboards, coding
sandbox, system-design whiteboard, CV/emotion/eye-tracking claims, mobile app,
unnecessary multi-agent/RAG architectures. Leave clean extension points only.
