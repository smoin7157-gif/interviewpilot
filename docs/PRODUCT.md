# InterviewOS — Product overview

**InterviewOS** is interview **practice** software: generate role-specific questions, score written answers, run spoken mocks, and review debriefs. It is not an ATS, resume scanner, or job-application tool.

## Core loops

1. **Setup** — role, level, optional JD, resume, GitHub, projects (`/interviews/new`).
2. **Generate** — personalized question set with suggested answers and context.
3. **Written practice** — submit answers; receive scores and follow-ups.
4. **Voice mock** — browser speech, AI interviewer, transcript saved (`/mock/[id]`).
5. **Debrief & history** — six-dimension score, export Markdown, re-practice (`/history`).

## Public surfaces

- Marketing: `/`, `/faq`
- Legal: `/privacy`, `/terms`, `/cookies`, `/contact`
- AI crawlers: `/llms.txt`, `/llms-full.txt`

## Operations

- Health: `GET /api/health` (database + config readiness)
- Deploy: Vercel + PostgreSQL; see `OPERATIONS.md`