# InterviewOS — Database

PostgreSQL via Prisma (runs on **Neon** serverless Postgres for Vercel deploys
and locally). Schema in `prisma/schema.prisma`, migrations in
`prisma/migrations/`. `DATABASE_URL` is a Postgres connection string (pooled
`-pooler` URL for serverless). Ownership is enforced at the query layer; RLS
policies can be layered on later.

## Entities

### users
| Column | Notes |
| --- | --- |
| `id` | cuid PK |
| `email` | unique, stored lowercased |
| `name` | display name |
| `passwordHash` | bcrypt hash |
| `createdAt` / `updatedAt` | |

### interview_sessions
| Column | Notes |
| --- | --- |
| `id` | cuid PK |
| `userId` | FK → users, **ownership** |
| `role` | target job role (free text), e.g. "Software Development Engineer" |
| `seniority` | **experience level** — Fresher / 0–1 years / 1–3 years / 3–5 years / 5+ years |
| `company` | nullable target company |
| `companyType` | nullable — Product Company / Service Company / Startup / MNC / Consulting / Other |
| `interviewType` | nullable — General / Technical / Behavioral / HR Recruiter / Coding / System Design / Data ML / Product / Mixed |
| `jobDescription` | nullable text (context for generation) |
| `githubUrl` | nullable GitHub profile URL (public repos only are read) |
| `githubContext` | nullable JSON `{ username, repoCount, languages[], topRepos[] }` |
| `resumeFileName` | nullable original PDF filename (no raw file stored) |
| `resumeContext` | nullable JSON — extracted resume facts (see below) |
| `status` | `DRAFT` → `READY` once questions exist |
| `questionCountTarget` | 10 / 15 / 20 |
| `createdAt` / `updatedAt` | `updatedAt` bumped on practice activity |

`resumeContext` JSON shape: `{ skills[], experience[], education[], projects[], achievements[], certifications[], technologies[] }` — only facts present in the uploaded PDF; never inferred.

### candidate_projects
Manual project entries the candidate adds during setup.

| Column | Notes |
| --- | --- |
| `id` | cuid PK |
| `sessionId` | FK → sessions (cascade) |
| `name` | required |
| `repositoryUrl` / `description` / `techStack` / `contribution` | nullable |
| `createdAt` | |

*Migration `interviewos_setup_fields` added `companyType`/`interviewType` and
remapped legacy seniority values (Intern, Entry Level, Junior, Mid Level,
Senior, Lead) onto the InterviewOS experience-level vocabulary.*

### interview_questions
| Column | Notes |
| --- | --- |
| `id` | cuid PK |
| `sessionId` | FK → sessions (cascade) |
| `question`, `category`, `difficulty` | category ∈ Technical / Behavioral / Project / Role-specific / General |
| `reason` | "why this matters" |
| `suggestedAnswer` | revealed on demand |
| `followUps` | JSON array of follow-up questions |
| `sourceContext` | nullable JSON `string[]` — which candidate/job source the question draws from |
| `orderIndex` | display order |
| `status` | `NOT_STARTED` / `PRACTICED` / `SKIPPED` |
| `createdAt` | |

### question_attempts
| Column | Notes |
| --- | --- |
| `id` | cuid PK |
| `userId` | FK → users (cascade) |
| `questionId` | FK → questions (cascade) |
| `prompt` | exact prompt practiced (main question or a follow-up) |
| `answer` | the user's actual written answer |
| `score` | 0–100 from evaluation |
| `feedback` | JSON `{ strengths[], missing[], improvements[] }` |
| `createdAt` | latest attempt = "last practiced" |

## Rules

- **Ownership**: every session belongs to one user. All reads/writes are
  filtered through `userId` (see `src/lib/data.ts` and each route handler). A
  user can never reach another user's sessions, questions, or attempts — this
  is verified at the query level and would be reinforced by RLS on Postgres.
- **Cascades**: deleting a user/session/question removes dependents via
  `onDelete: Cascade`.
- **Indexes**: `interview_sessions(userId)`,
  `interview_questions(sessionId, orderIndex)`, `question_attempts(userId)`,
  `question_attempts(questionId)`.
- **JSON columns**: `followUps`, `feedback` are validated before writing.

### mock_interview_sessions
Voice-mode practice sessions (Phase 3). A mock rehearses one interview session.

| Column | Notes |
| --- | --- |
| `id` | cuid PK |
| `userId` | FK → users, **ownership** |
| `interviewSessionId` | FK → sessions (cascade) — the interview being rehearsed |
| `status` | `SESSION_STARTED` → `QUESTION_COMPLETE` → `SESSION_COMPLETE` \| `ERROR` |
| `maxQuestions` | cap on main (non-follow-up) questions |
| `overallScore` | nullable — set by the debrief (Phase 4) |
| `debrief` | nullable JSON — full debrief payload (Phase 4): `{ overallScore, breakdown[{dimension,score,note}], strengths[], weaknesses[], missedOpportunities[], strongestAnswer{question,why}, weakestAnswer{question,why}, recommendedPractice[], provider, model }` |
| `startedAt` / `endedAt` | endedAt set when the session completes |
| `createdAt` / `updatedAt` | |

Debriefs are generated from the stored transcript (`interview_turns` only —
raw audio/video is never stored) by the AI provider abstraction and persisted
here. The endpoint is `POST /api/mock-interviews/:id/debrief` (see API.md).

### interview_turns
One row per spoken exchange in a mock session — the transcript. Raw audio/video is never stored.

| Column | Notes |
| --- | --- |
| `id` | cuid PK |
| `mockSessionId` | FK → mock_interview_sessions (cascade) |
| `turnIndex` | ordering within the session |
| `speaker` | `AI` \| `CANDIDATE` |
| `transcript` | the spoken text (AI question or candidate answer) |
| `action` | nullable — interviewer structured action (`ask_question` / `ask_followup` / `move_topic` / `end_interview`) on AI turns |
| `category` / `difficulty` | nullable — the question's category/difficulty on AI turns |
| `createdAt` | |

*Migration `interviewos_mock_interview` added the two mock entities above.*

## Planned entities (not yet in schema)

Reserved for the roadmap (see ROADMAP.md); do not create until wired:

- `profiles` — full name / extended candidate profile

## Local setup

Migrations apply to the Postgres DB in `DATABASE_URL` (`npx prisma migrate
deploy` on deploys, `npx prisma migrate dev` locally). Inspect with
`npx prisma studio`. No local database files are used anymore.
