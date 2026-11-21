# InterviewOS — SEO launch checklist

Adapted for **interviewpilot** (InterviewOS). Set `APP_URL` to your canonical production URL (including `https://`).

## Done in code

| Step | Status |
| --- | --- |
| Public `index, follow` vs private `noindex` | App, focus, and 404 use `noindex`; marketing/auth/legal indexed |
| `robots.txt` | Private routes disallowed; AI crawlers allowed on public pages; preview deployments block all |
| `sitemap.xml` | Home, signup, login, FAQ, privacy, terms |
| Canonical URLs | `alternates.canonical` on public pages; `metadataBase` from `APP_URL` |
| Titles & descriptions | Unique per public page (~140–160 char descriptions) |
| JSON-LD | Organization, WebSite, SoftwareApplication (home); FAQPage + Breadcrumb (FAQ) |
| `llms.txt` / `llms-full.txt` | `/llms.txt` summary + `/llms-full.txt` extended facts for AI crawlers |
| IndexNow | `INDEXNOW_KEY` → `/{key}.txt`; see `docs/seo/AI_SEARCH_RANKING.md` |
| Home citability | `/#what-is-interviewos` answer-first block on the landing page |
| GA4 hook | `NEXT_PUBLIC_GA_ID` (production only) |
| Search verification | `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION` env vars |

## Your manual steps

1. **Production URL** — Set `APP_URL` on Vercel to your canonical HTTPS URL. Redeploy after changing env vars.
2. **Google Search Console** — Add property, verify (HTML tag via `GOOGLE_SITE_VERIFICATION` or DNS), submit `https://YOUR_DOMAIN/sitemap.xml`, request indexing for `/` and `/faq`.
3. **GA4** — Create a property, paste Measurement ID into `NEXT_PUBLIC_GA_ID`, redeploy.
4. **Bing Webmaster** — Import from GSC or use `BingSiteAuth.xml` / meta tag via `BING_SITE_VERIFICATION`.
5. **Smoke test** — `curl -I` home for 200; fetch `/robots.txt` and `/sitemap.xml`; confirm preview URL robots disallow `/`.

## Not in repo

- Domain-level 301 (apex → www or reverse) — configure on your DNS/hosting provider.
- Lighthouse 90+ mobile — run locally after deploy and iterate on images/fonts.
- scorebadge.com — optional footer badge; requires account if offered.