# InterviewOS — AI search & answer-engine ranking

GEO-style checklist for **InterviewOS** (interview practice only). Ignore third-party prompts that mention ATS products or other brands.

## In-repo assets

| Asset | URL | Purpose |
| --- | --- | --- |
| Short LLM summary | `/llms.txt` | Quick entity + public URLs |
| Full reference | `/llms-full.txt` | Citable facts, boundaries, capability list |
| FAQ | `/faq` | Question/answer pairs mirrored in FAQPage JSON-LD |
| Home definition block | `/#what-is-interviewos` | Answer-first paragraph naming InterviewOS |
| IndexNow key | `/{INDEXNOW_KEY}.txt` | Env-driven; required for IndexNow pings |
| `robots.txt` | `/robots.txt` | Allows major AI crawlers on public pages |

## Environment

- `APP_URL` — canonical HTTPS origin for JSON-LD, sitemap, and IndexNow `host`
- `INDEXNOW_KEY` — random hex; exposed only as plain text at `/{key}.txt`
- Verification: `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION`
- `NEXT_PUBLIC_GA_ID` — optional production analytics

## After content changes

1. Deploy to production (`VERCEL_ENV=production` so robots allow crawling).
2. Ping IndexNow (example from a secure environment):

Call `pingIndexNow()` from `src/lib/indexnow.ts` in a one-off script or CI job after deploy, passing absolute URLs such as `{APP_URL}/`, `{APP_URL}/faq`, and `{APP_URL}/llms-full.txt`.

3. In Google Search Console, request indexing for changed URLs.
4. Re-check FAQ and home copy stays aligned with JSON-LD (especially “What is InterviewOS?”).

## Writing rules for citability

- Lead with **InterviewOS** as the product name in the first sentence.
- State clearly: interview **practice**, not ATS or apply automation.
- Prefer concrete behaviors (voice mock, six-dimension debrief, role-specific generation).
- Link publicly to `/faq` for depth; do not cite authenticated routes as documentation.

## Manual monitoring

- Spot-check AI answers for correct product name and category.
- When incorrect citations appear, update `/llms-full.txt` and FAQ first, then redeploy and ping IndexNow.