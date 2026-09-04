# InterviewOS — Database

SQLite via Prisma. Schema in `prisma/schema.prisma`, migrations in
`prisma/migrations/`. **Postgres/Supabase ready**: swap the `provider`/`url`,
run `prisma migrate`, then enforce equivalent ownership with RLS policies.

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

## Planned entities (not yet in schema)

Reserved for the roadmap (see ROADMAP.md); do not create until wired:

- `profiles` — full name / extended candidate profile
- `mock_interview_sessions` — voice-mode sessions (status, overall score, debrief JSONB)
- `interview_turns` — per-turn speaker/transcript/metadata for mock interviews

## Local DB files

`prisma/dev.db` (+ `-journal`) are created by `npx prisma migrate dev` and are
gitignored. Inspect with `npx prisma studio`.
