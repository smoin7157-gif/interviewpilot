# InterviewOS platform hardening (accuracy, security, performance)

Backend-only hardening for scores, extraction, matching, and AI paths. **No UI, layout, or workflow changes.**

## Critical paths (score / match / rewrite analogs)

| Path | Entry | Output |
|------|--------|--------|
| Written answer score | `src/lib/ai/service.ts` → `evaluateAnswer` | `EvaluationResult` (score 0–100, feedback arrays) |
| Resume extraction | `extractResumeData` | `ResumeData` (grounded to source text) |
| Question generation | `generateQuestions` | `GeneratedQuestion[]` (suggested answers grounded) |
| Follow-ups | `generateFollowUps` | `string[]` |
| Mock interviewer | `driveInterview` | `InterviewerDecision` |
| Session debrief | `generateDebrief` | `DebriefResult` (overall from weighted breakdown) |
| JD skill matching | `src/lib/ai/jd-text.ts` | Required vs nice-to-have skills (deterministic) |

There is **no ATS optimizer** in this repo; JD “matching” is deterministic skill extraction for question grounding.

## Scoring formulas (unchanged contracts)

- **Written evaluation (live):** Model JSON validated by `parseEvaluation` (Zod); score clamped 0–100; empty feedback backfilled via `evaluateAnswerHeuristic` without changing the headline score.
- **Written evaluation (fallback):** Heuristic in `evaluation-heuristic.ts` (word count, example/result/structure signals, cap 95).
- **Debrief overall:** `debriefOverallScore` in `validate.ts` — weighted sum of six dimensions (`DEBRIEF_WEIGHTS`); model headline replaced when it disagrees.

## Accuracy measures shipped

- Stable input hashing + 10‑minute in-memory cache: evaluate, resume, follow-ups, debrief, interviewer.
- OpenRouter **seed** from input hash on all structured completions.
- Zod validation: evaluation, follow-ups, questions, resume, debrief, interviewer.
- Resume / suggested-answer / debrief-evidence **grounding** (no invented facts in structured fields).
- Must-have vs nice-to-have JD skills in `extractJdFacts` and grounded question pools.

## Security

- API routes: `requireApiUser` + row ownership (`userId` on session/question/mock).
- Rate limits on AI/expensive routes (`src/lib/rate-limit.ts`).
- Untrusted text: `sanitize.ts` + `guardText` before prompts.
- AI failure logs: truncated via `sanitizeAiLogMessage` (no full resumes/JDs in logs).

## Performance

- Request-scoped React `cache` on list/overview paths (see `data.ts`).
- AI cache deduplicates identical normalized inputs within TTL.
- OpenRouter timeouts and transient-only retries in `service.ts`.

## Verify locally

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```