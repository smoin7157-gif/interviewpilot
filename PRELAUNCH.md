# Pre-launch verification — InterviewOS (~2k students)

**Repository:** `smoin7157-gif/interviewpilot` (product name: **InterviewOS**).  
**Not in V1:** ATS scanner, resume rewriter, Smart Apply, job-card apply flows (prompt paths that mention those are **N/A** here).

**Branch:** `platform/prelaunch-verification` (hardening + observability + cost control cherry-picked onto `main`).

---

## Phase 1 — Major journeys (expected)

| Journey | Steps | Expected outcome |
|---------|--------|------------------|
| **Landing → auth** | `/` → `/signup` or `/login` | Session cookie set; `proxy.ts` gates `(app)` routes |
| **Create interview** | `/interviews/new` → setup → generate stream | 10/15/20 questions saved; `status` → READY |
| **Written practice** | `/interviews/[id]` → answer → evaluate | Score 0–100 + feedback; attempt in `question_attempts` |
| **Follow-ups** | Follow-up tab / `POST .../follow-up` | Up to 3 follow-ups; rate limited |
| **Resume attach** | Upload PDF/DOCX | Text extracted; `resume_context` JSON; file **not** stored |
| **GitHub attach** | Public URL | `github_context` JSON or clear error |
| **Mock interview** | `/mock/[id]` → turns → end → debrief | Transcript only; debrief 6 dimensions |
| **History** | `/history`, `/history/[id]` | Own mocks only; delete/re-practice |
| **Logout / expiry** | Settings / invalid cookie | Redirect login; no cross-user data |

---

## Phase 2 — API map (all except `/api/health`)

| Area | Auth | Rate limit | Ownership |
|------|------|------------|-----------|
| `interviews/*` | `requireApiUser` | create/edit/generate/resume/github | `userId` on session |
| `questions/*` | yes | evaluate, practice, follow-up | `session.userId` |
| `mock-interviews/*` | yes | create, turn, debrief | `getOwnedMockSession` |
| `GET followups` | yes | none (DB read) | session scoped |

**External calls:** OpenRouter (optional), GitHub public API, browser speech (client-only).

---

## Phase 3 — Accuracy & consistency (automated + code review)

| Control | Status |
|---------|--------|
| Same input → same score (fallback + cache) | `evaluation-heuristic.ts`, `stable-input-cache.ts` |
| Resume / suggested answer grounding | `resume-grounding.ts`, `answer-grounding.ts` |
| JD must-have vs nice-to-have | `partitionJdSkillZones`, `extractJdFacts` |
| Zod validation on model JSON | `validate.ts` |
| Debrief overall from weighted breakdown | `debriefOverallScore` |
| Malformed model output | Repair once, else fallback |

**Tests:** `npm test` — **335+ pass** (1 skipped live golden).

---

## Phase 4 — Performance

| Item | Status |
|------|--------|
| Question list from DB (no AI per navigation) | Implemented |
| AI response cache (10 min, hash keys) | `stable-input-cache.ts` |
| Prisma indexes on `userId`, session lists | `schema.prisma` |
| Generation stream aborts if client disconnects | `generate/route.ts` |
| OpenRouter per-task timeouts | `openrouter.ts` |

**Remaining:** In-memory rate limiter is **per serverless instance**, not global quota at 2k scale.

---

## Phase 5 — Security

| Check | Status |
|-------|--------|
| All protected APIs require session | Verified grep |
| Row ownership on mutations | `userId` / `owned-resource.ts` |
| Upload size/type (resume 3 MB, magic bytes) | `resume/route.ts` |
| Secrets server-only | No `OPENROUTER_*` in client bundle |
| PII in logs | `safe-log.ts`, `ops-log.ts` redaction |
| Auth IP rate limits | `auth-rate-limit.ts` |

---

## Phase 6 — Error handling

| Scenario | Behavior |
|----------|----------|
| OpenRouter down / invalid key | Fallback provider; UI notice |
| Empty/tiny resume text | 422 upload or skip live model (`input-bounds.ts`) |
| Double generate | HTTP 409 |
| Debrief without enough answers | HTTP 422 |
| Invalid JSON body | 400 / 422 with `{ error }` |

---

## Phase 7 — Readiness for ~2k students

| Topic | Recommendation |
|-------|----------------|
| **OPENROUTER_API_KEY** | Required in production (`assertEnv`) |
| **DATABASE_URL** | Use pooled Neon URL on Vercel |
| **Monitoring** | `GET /api/health` + `[ops]` logs |
| **Rate limits** | Documented in `COST_CONTROL.md` — tune if abuse seen |
| **Horizontal scale** | Consider Redis rate limit + AI cache if cold starts multiply |

---

## Phase 8 — Commands (this branch)

```bash
npm test          # pass
npm run lint      # pass
npx tsc --noEmit  # pass (test type fixes included)
npm run build     # pass
```

---

## Open pull requests (optional merges before launch)

| PR | Focus |
|----|--------|
| #3 | Hardening docs + safe logs (subset of this branch) |
| #4 | Observability |
| #5 | Cost control |
| #6 | UI polish only (no backend) |

This branch **consolidates #3–#5** for a single pre-launch merge.

---

## Go / No-Go recommendation

**Conditional GO** for a controlled rollout (~2k students) if:

1. **Production env:** `DATABASE_URL`, `AUTH_SECRET`, `OPENROUTER_API_KEY` set and health check green.  
2. **Merge & deploy** `platform/prelaunch-verification` (or `main` after merging this PR).  
3. **Smoke test** on preview: signup → generate → evaluate → mock debrief.  
4. **Ops:** Watch OpenRouter credits and 429 rate; in-memory limits may need Redis later if abuse appears.

**No-Go** if:

- Production deploys without `OPENROUTER_API_KEY` and you require live AI (fallback only is intentional but weaker).  
- No database backups / monitoring for Postgres.  
- Expecting global per-user AI quotas from in-memory limiter alone.

---

## Student journey confirmation

Core paths are implemented and tested in code; manual QA on staging is still required before merge (see PR warning).

*See also [interview.md](./interview.md), [HARDENING.md](./HARDENING.md), [OPERATIONS.md](./OPERATIONS.md), [COST_CONTROL.md](./COST_CONTROL.md).*