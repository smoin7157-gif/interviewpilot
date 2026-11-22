# InterviewOS — compliance audit inventory

**Product:** InterviewOS (interview practice only — not ATS, payments, or job application automation).  
**Last audited:** 2026-11-21 (codebase). **Lawyer review required** before treating legal pages as final.

## Pages and forms

| Surface | Path | Personal data collected |
| --- | --- | --- |
| Home | `/` | None (public) |
| Sign up | `/signup` | Name, email, password |
| Log in | `/login` | Email, password |
| New interview | `/interviews/new` | Role, JD, resume PDF/DOCX, GitHub URL, projects |
| Workspace / mock / history | App routes | Answers, transcripts, scores |
| Settings | `/settings` | Name, password change; export/delete account |
| Legal | `/privacy`, `/terms`, `/cookies`, `/contact` | None |

## Cookies and local storage

| Name | Type | Provider | Purpose | Category | Duration |
| --- | --- | --- | --- | --- | --- |
| `ip_session` | httpOnly cookie | InterviewOS | Signed login session | Necessary | Session / JWT expiry |
| `_ga`, `_ga_*` | cookie | Google (GA4) | Analytics (only after opt-in) | Analytics | Per Google |
| `ip_cookie_consent_v1` | localStorage | InterviewOS | Stores consent choices | Necessary (preference) | Until cleared |

## Scripts and third parties

| Service | Purpose | Data shared | Consent required |
| --- | --- | --- | --- |
| OpenRouter + LLM provider | AI generation, scoring, debrief | Prompt text (answers, JD, resume extract) | Covered by signup + privacy notice |
| PostgreSQL host (e.g. Neon) | Database | All app data | DPA with host |
| Vercel (typical) | Hosting, logs | Request metadata | DPA |
| GitHub API | Optional public profile context | Public repo metadata | User-initiated |
| Google Fonts (next/font) | Typography | Self-hosted via Next — no runtime Google CSS | N/A |
| Google Analytics 4 | Usage analytics | Client IDs, page views | **Yes — gated behind consent** |

No payment SDK, ad pixels, chat widgets, or social embeds in this repo.

## Logging

- Server logs: request paths, errors (no resume body or answer text by policy in `safe-log` helpers).
- AI errors sanitized in platform hardening paths.

## Gaps closed in this legal pass

- Cookie policy page and consent banner (Accept / Reject / Customize).
- GA4 loads only after analytics consent (Consent Mode default denied).
- Signup explicit terms checkbox + stored consent timestamp.
- Resume upload AI-processing notice.
- Settings: download data JSON + delete account.
- Grievance / operator block on `/contact` with `TODO(founder)` placeholders.
- `security.txt` and `humans.txt` in `public/`.
- Jurisdiction mapping and breach checklist docs.

## Not applicable (this product)

- Refund / checkout pages — no paid plans in this build.
- Marketing email / WhatsApp opt-in — not implemented.