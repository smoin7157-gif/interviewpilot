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


## Phase 4 — Debrief & History ⬜

- Debrief from the stored mock transcript (`mock_interview_sessions.debrief`,
  `interview_turns`) — overall score + breakdown (technical, communication,
  structure, relevance, project knowledge, problem solving), strengths/
  weaknesses, missed opportunities, strongest/weakest answers, recommended
  practice
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
