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

## Phase 2 — Written practice + candidate context ⬜

Currently partial: question list/detail, written answers, AI evaluation,
follow-ups, history already ship for role/level/company/JD context. Missing:

- Candidate-context inputs: **resume upload (PDF; DOCX if clean) + server-side
  parse** (skills/experience/education/projects/achievements/certs — never
  invent), **GitHub URL validation + public repo retrieval** (metadata, README,
  languages; no private repos), **manual projects** (name, repo URL,
  description, tech stack, contribution)
- Normalize candidate context into one structure; priority: role → interview
  type → JD → resume → projects → GitHub → company → experience
- Question engine v2: contextual generation (probe what the candidate claims),
  InterviewOS distribution per interview type, schema with
  `source_context`/`reason`/`follow_up_questions`, new categories
  (coding / system_design / data_ml / company) and easy/medium/hard difficulty
- Follow-up engine reacting to actual answers (not pre-generated picks)
- DB: `candidate_projects` (and resume/GitHub reference columns)

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
