# Compliance status — InterviewOS (2026-11-21)

**Lawyer review required** before calling legal pages final.

| # | Item | Status |
| --- | --- | --- |
| 1 | Privacy policy | Done — `/privacy` |
| 2 | Terms | Done — `/terms` |
| 3 | Cookie policy | Done — `/cookies` |
| 4 | Cookie banner | Done — Accept / Reject / Customize |
| 5 | Refund policy | N/A — no paid checkout |
| 6 | Form consent | Done — signup checkbox + consent fields on user |
| 7 | Data minimization | Partial — audit doc; retention TODO for founder |
| 8 | Export / delete | Done — Settings + `/api/account/export` |
| 9 | Analytics gated | Done — GA4 after consent |
| 10 | Embeds audit | Done — none beyond GA; fonts self-hosted via next/font |
| 11–14 | Accessibility | Partial — skip link, focus; run axe before launch |
| 15–16 | Honest marketing | Done — no fake reviews in repo |
| 17 | Business details | Partial — `/contact` with TODO(founder) fields |
| 18 | Jurisdiction notes | Done — `jurisdiction-notes.md`, breach checklist |

## Founder TODOs

Fill in `src/lib/legal/constants.ts` (`OPERATOR_DETAILS`) and governing-law city in `/terms`.