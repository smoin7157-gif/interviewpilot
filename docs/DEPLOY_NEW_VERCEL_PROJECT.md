# Deploy InterviewOS on a new Vercel project

Use this when the old Vercel project is stuck on a bad env/build state and you want a clean slate.

## 1. Database (Neon)

1. Create a **new** Neon project (or a fresh database in an existing Neon account).
2. Copy the **pooled** connection string (`-pooler` host) — required for serverless.
3. Put it in local `.env` as `DATABASE_URL`.

## 2. Required env (copy from `.env.example`)

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Neon pooler URL, `?sslmode=require` |
| `AUTH_SECRET` | 32+ random hex chars (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `OPENROUTER_API_KEY` | **Required in production** — boot fails without it |
| `APP_URL` | Set after first deploy to your `https://….vercel.app` or custom domain |

Optional: `GITHUB_TOKEN`, `NEXT_PUBLIC_GA_ID`, `INDEXNOW_KEY`, verification meta tags.

## 3. Log in and create a **new** Vercel project

```powershell
cd path\to\interviewpilot-clean
npx vercel login
npx vercel link --yes
```

When linking, choose **Create a new project** and pick a new name (e.g. `interviewos-v2`).

Do **not** reuse the broken project's name if you want a full reset.

## 4. Reuse env from the old `interviewpilot` project (recommended)

Vercel does not let the CLI **pull** secret values. Copy them in the dashboard:

1. [interviewpilot → Environment Variables (Production)](https://vercel.com/moin80172-7713s-projects/interviewpilot/settings/environment-variables)
2. Copy `DATABASE_URL` and `OPENROUTER_API_KEY` (and `APP_URL` if set).
3. Paste into [interviewos-v2 → Environment Variables](https://vercel.com/moin80172-7713s-projects/interviewos-v2/settings/environment-variables) for **Production** and **Preview**, or run:

```powershell
node scripts/import-vercel-env-interactive.mjs
```

**Do not** copy a `localhost` / Prisma Dev `DATABASE_URL` — use the Neon pooler URL from the old project only.

## 4b. Push env vars from local `.env` (optional)

```powershell
node scripts/push-vercel-env.mjs
```

Then set `APP_URL` in the Vercel dashboard to the production URL and redeploy once.

## 5. Deploy

```powershell
npx vercel deploy --prod
```

`vercel.json` sets the Vercel build to `npm run build:vercel` (`migrate deploy` + `next build`). Local `npm run build` is unchanged and does not need a live DB.

## 6. Verify

```powershell
curl -i https://YOUR-APP.vercel.app/api/health
```

Expect `200` with `"database": "reachable"` and `"ai": "live"` when `OPENROUTER_API_KEY` is set.

## Git-connected deploys (optional)

Production URL for GitHub **About → Website** and `APP_URL`: `https://interviewos-v2.vercel.app`.

Only one Vercel project should stay connected to `smoin7157-gif/interviewpilot` — **`interviewos-v2`**. Disconnect **`interviewpilot`** (old) under Vercel → that project → Settings → Git, or run `vercel link --project interviewpilot` then `vercel git disconnect`.

## Common old-project failures this avoids

- **Missing migrations** — `migrate deploy` on build.
- **Empty `OPENROUTER_API_KEY` in production** — startup check refuses to boot (clear error in logs).
- **Wrong `DATABASE_URL`** — health returns `503` with a hint; fix env and redeploy.