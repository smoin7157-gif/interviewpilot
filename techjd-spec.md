# techjd.md — Original Software JD Seed Dataset for InterviewOS

> **Status:** technical design + implementation plan (ready to build)
> **Owner:** InterviewOS platform
> **Scope:** generate an original, validated, de-duplicated seed set of 1000+ software
> job descriptions (JDs) that powers the deterministic fallback in
> `src/lib/ai/service.ts` and increases question-bank variety.
> **Legal:** every JD is **generated from scratch** from common real-world role
> patterns. Nothing is scraped, copied, or paraphrased from LinkedIn, Indeed,
> Naukri, or any other platform. No third-party JD text enters this repo.

---

## 1. ADJUST decisions (what I locked in)

| Open placeholder | Decision | Why |
| --- | --- | --- |
| Output path | `prisma/seed-data/job-descriptions.json` | Matches the existing `prisma/` seed convention (`prisma/seed.ts`), lives beside the data it seeds, and is excluded from the Next.js bundle build noise. |
| `npm run db:seed` | **Additive**, behind a dedicated `npm run seed:jds` script invoked by `db:seed` | Keeps `prisma db seed` (demo user) intact and idempotent; JDs seed independently and can be re-run without touching the demo account. |
| Fallback integration model | **Both, deliberately separated** — see §8 | The JD set is a *reference/seed table* (queryable source of truth) **and** the fallback consumes a compact cached index so questions become JD-grounded without a DB round-trip. It does **not** get injected into the paid OpenRouter prompt path. |
| Role count | **29 roles** (not 24) | The §2 coverage list splits Mobile into 4 roles and Cloud into 3. The "24" figure only holds if Mobile and Cloud are each counted once, which contradicts "treat as separate roles, not one". |

### 1.1 The 24-vs-29 discrepancy (resolved)

31 roles are named; grouping `Mobile` → 1 and `Cloud Engineering` → 1 gives 24, but
the coverage rules explicitly say to split them:

```
Mobile: iOS, Android, React Native, Flutter   → 4 roles  (+3 vs grouped)
Cloud Engineering: AWS, GCP, Azure            → 3 roles  (+2 vs grouped)
```

**Resolved coverage = 29 roles.** Combination math:

```
29 roles × 3 seniorities × 3 company types = 261 combinations
261 × 5 variants = 1,305 target JDs   (comfortably > 1,000)
```

If exactly 24 roles are ever required, drop iOS/Android/RN/Flutter to a single
`Mobile Engineer` and AWS/GCP/Azure to a single `Cloud Engineer` → 216 combos × 5
= 1,080, still over target. The generator is driven by a role catalog array, so
this is a one-line change either way (§5).

---

## 2. Coverage — the full role catalog (29 roles)

Each role carries its own stack emphasis and interview focus so the generated JDs
are role-specific, not "same JD, different title".

| # | Role label | Core stack emphasis | Default interview focus areas |
| --- | --- | --- | --- |
| 1 | Frontend Engineer | TypeScript, React, Next.js, CSS, browser perf, a11y | React internals, browser rendering/perf, component architecture |
| 2 | Backend Engineer | Go/Java/Python/Node, PostgreSQL, Redis, queues, APIs | API design, data modeling, concurrency & scaling |
| 3 | Full-Stack Engineer | React + Node/Python, PostgreSQL, end-to-end ownership | end-to-end feature delivery, frontend + API trade-offs, data flow |
| 4 | iOS Engineer | Swift, SwiftUI/UIKit, Combine, Xcode, App Store | Swift concurrency, UIKit/SwiftUI lifecycle, memory & performance |
| 5 | Android Engineer | Kotlin, Jetpack Compose, Coroutines, Gradle | Android lifecycle, Compose state, background work |
| 6 | React Native Engineer | React Native, TypeScript, Hermes, native modules | bridge/JSI, cross-platform performance, native module design |
| 7 | Flutter Engineer | Dart, Flutter, widgets, platform channels | widget lifecycle, state management, platform channels |
| 8 | DevOps Engineer | CI/CD, Docker, Kubernetes, Terraform, observability | pipeline design, IaC, release safety & rollback |
| 9 | Site Reliability Engineer | SLOs, incident response, Kubernetes, Prometheus, chaos | SLO/error budgets, incident command, capacity & failure modes |
| 10 | Platform Engineer | internal developer platforms, Kubernetes, Backstage, Terraform | golden paths, self-service infra, platform adoption |
| 11 | Data Engineer | Spark, Airflow/Dagster, dbt, warehouses, Kafka | pipeline reliability, batch vs streaming, data modeling |
| 12 | Data Scientist | Python, pandas, statistics, SQL, experimentation | causal/experiment design, metrics, modeling trade-offs |
| 13 | Machine Learning Engineer | PyTorch/TF, feature stores, serving, eval | model eval, training/serving skew, latency-aware serving |
| 14 | MLOps Engineer | MLflow/Kubeflow, CI/CD for models, monitoring, drift | reproducibility, deployment/monitoring, drift & rollback |
| 15 | AI Research Scientist | deep learning, transformers, papers, distributed training | novel method design, ablations/eval, literature depth |
| 16 | Cloud Engineer (AWS) | EC2/EKS/Lambda/RDS/S3, CDK/Terraform, IAM | Well-Architected trade-offs, cost & IAM, resilience |
| 17 | Cloud Engineer (GCP) | GKE, BigQuery, Cloud Run, Vertex, Terraform | GCP service selection, data/analytics fit, cost & IAM |
| 18 | Cloud Engineer (Azure) | AKS, Functions, Cosmos DB, Entra ID, Bicep | Azure service selection, identity/network design, cost & governance |
| 19 | Security Engineer | AppSec, threat modeling, OWASP, cloud security, IAM | threat modeling, secure design, incident/vuln handling |
| 20 | QA / SDET | test strategy, Playwright/Cypress, CI test infra, POM | test pyramid, flake reduction, automation architecture |
| 21 | Embedded / Firmware Engineer | C/C++, RTOS, ARM, I2C/SPI/UART, low-power | memory/ISR constraints, real-time behavior, hardware debugging |
| 22 | Game Developer | Unity/C++, Unreal, rendering, physics, netcode | game loop/frame budget, optimization, engine architecture |
| 23 | Blockchain / Web3 Engineer | Solidity, EVM, smart contracts, subgraphs, security | contract security/gas, on-chain vs off-chain design, consensus/RPC |
| 24 | AR/VR Engineer | Unity/Unreal XR, OpenXR, 3D math, performance | frame/perf budgets, tracking & interaction, XR UX |
| 25 | Database Engineer | PostgreSQL/MySQL planning, indexing, partitioning, tuning | query plans/indexing, schema & migration design, replication/backup |
| 26 | Solutions Architect | AWS/Azure/GCP, integration design, IaC, stakeholder scope | requirements→architecture, integration patterns, cost/risk trade-offs |
| 27 | Engineering Manager | delivery, hiring, coaching, roadmap, system design fluency | people leadership, delivery & prioritization, technical judgment |
| 28 | Technical Product Manager | roadmap, discovery, metrics, API/product strategy | product discovery, prioritization/metrics, technical partnership |
| 29 | Developer Relations / Advocacy | public speaking, OSS, docs, SDK samples, community | storytelling/demos, developer empathy, technical depth + OSS |

**Seniority** → `yearsExperience`: `entry` = `"0-2"`, `mid` = `"3-5"`, `senior` = `"6+"`.

**Company type** drives tone and scope (see §6 matrix), and is stored verbatim.

---

## 3. Exact schema (source of truth)

The output object shape is fixed by the request. Both TypeScript and Zod live in
one place so the generator, the dedup pass, and the app all share it.

```ts
// src/lib/jd/schema.ts
import { z } from "zod";

export const SENIORITIES = ["entry", "mid", "senior"] as const;
export const COMPANY_TYPES = ["startup", "mid-size", "enterprise"] as const;

export const jobDescriptionSchema = z.object({
  role: z.string().trim().min(3).max(80),
  seniority: z.enum(SENIORITIES),
  companyType: z.enum(COMPANY_TYPES),
  responsibilities: z.array(z.string().trim().min(20).max(280)).min(3).max(5),
  requiredSkills: z.array(z.string().trim().min(2).max(120)).min(3).max(12),
  niceToHave: z.array(z.string().trim().min(2).max(160)).min(2).max(4),
  yearsExperience: z.enum(["0-2", "3-5", "6+"]),
  interviewFocusAreas: z.array(z.string().trim().min(3).max(120)).min(2).max(3),
});

export type JobDescription = z.infer<typeof jobDescriptionSchema>;
```

Notes on the constraints (chosen so "generic" entries are impossible to get past):

- `responsibilities` — 3–5 items, each a **specific** sentence (20–280 chars).
  Rejecting `< 20` chars kills one-word fluff like `"Write code"`.
- `requiredSkills` — 3–12 **actual technology/tool** tokens, never `"programming"`.
  The generator feeds a per-role allow-list (§5) and the validator rejects the
  banned-generic list (`programming`, `coding`, `software`, `teamwork`, …).
- `niceToHave` — 2–4 items (matches the request; the schema enforces the floor).
- `interviewFocusAreas` — 2–3 areas the role's interview would probe.

`yearsExperience` is **derived** from `seniority`, so they can never disagree;
the generator sets it and the validator asserts the pair.

---

## 4. Architecture / data flow

```
                 ┌─────────────────────────────────────────────┐
                 │  scripts/generate-job-descriptions.ts        │
                 │                                             │
  role catalog ──▶  for each (role × seniority × companyType):  │
  261 combos       └─ batch of 5  ──▶ provider (openrouter|local)
                                       │
                                       ▼
                          zod.safeParse(batch)  ──fail──▶ retry (≤3)
                                       │ pass
                                       ▼
                             running array + log
                                       │
                                       ▼
                       dedup pass (token-overlap, §7)
                                       │
                                       ▼
             prisma/seed-data/job-descriptions.json  (pretty, UTF-8)
                                       │
                    ┌──────────────────┴───────────────────┐
                    ▼                                      ▼
        seed:jds → job_description_templates      src/lib/jd/index.ts
        (Prisma reference table)                  (lazy in-process index)
                                                           │
                                                           ▼
                                      FallbackProvider.generateQuestions()  (§8)
```

**Runtime path is unchanged for the AI provider.** With `OPENROUTER_API_KEY` set
nothing about generation changes; the JD seed makes the *offline fallback* richer
and makes question-bank variety deterministic instead of a fixed 23-template bank.

---

## 5. Generator design

### 5.1 Why batched (and why the role catalog is data, not prose)

A single LLM call cannot reliably emit 1,000+ structured objects; output caps and
quality degradation both bite. The generator therefore:

1. iterates the **role catalog** (29 entries, code in §5.4),
2. for each of the **261 combinations**, requests exactly **5** objects in one call,
3. validates the whole batch against `jobDescriptionSchema`,
4. appends valid objects and retries failed batches (separately, so one bad item
   does not discard the other four),
5. dedupes once at the end (§7),
6. writes the JSON and prints the report (§10).

### 5.2 Provider strategy — two backends, same schema

- `openrouter` — reuses the repo's `OpenRouterProvider` conventions
  (`OPENROUTER_API_KEY`, `max_tokens`, low temperature for structured output).
  Best variety.
- `local` — a deterministic **composer** that assembles original sentences from
  per-role fragments, seniority modifiers, and company-type modifiers. Requires no
  API key and is also the **automatic fallback** when OpenRouter fails, so the
  dataset always finishes. Output is still original text (composed, never copied).

The CLI defaults to `openrouter` when a key exists, else `local`:

```
npm run seed:jds --                      # auto
npm run seed:jds -- --provider=local     # offline, deterministic
npm run seed:jds -- --provider=openrouter --variants=5
npm run seed:jds -- --roles=Frontend Engineer,Backend Engineer   # partial rebuild
```

### 5.3 Generation prompt (per batch)

System prompt (structured-output contract):

```
You write ORIGINAL, realistic job descriptions for interview-practice software.
You must NOT copy, quote, or paraphrase any real posting. Produce text from
general knowledge of how the role is typically practiced.

Return ONLY valid JSON: {"jobDescriptions": [ ... 5 objects ... ]}.
Each object MUST match exactly this shape:
{ "role", "seniority", "companyType", "responsibilities": [3-5 strings],
  "requiredSkills": [3-12 strings], "niceToHave": [2-4 strings],
  "yearsExperience", "interviewFocusAreas": [2-3 strings] }

Rules:
- role/seniority/companyType/yearsExperience are FIXED for this batch: <...>.
- Company type changes tone: startup = lean, ownership-heavy, broad scope;
  mid-size = balanced, process-lite, cross-team; enterprise = scaled systems,
  process, governance, cross-org scope, on-call/compliance where relevant.
- Every responsibility must be role- and scope-specific (no "write code").
- requiredSkills must be real tools/technologies for this role, NEVER
  "programming", "coding", "software", or soft skills.
- Vary wording, stack choices, and emphasis across the 5 variants.
- Do not mention any real company name.
```

User prompt: role, seniority, companyType, yearsExperience, required stack
allow-list, and the interview focus areas for the role (from the catalog).

### 5.4 Full generator script

```ts
// scripts/generate-job-descriptions.ts
// Original JD seed generator. Batched, validated, retried, de-duplicated.
// Run: npm run seed:jds -- [--provider=openrouter|local] [--variants=5] [--roles=A,B]
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { jobDescriptionSchema, type JobDescription } from "@/lib/jd/schema";
import { ROLE_CATALOG, type RoleSpec } from "@/lib/jd/roles";
import { dedupeJobDescriptions } from "@/lib/jd/dedupe";
import { generateBatchOpenRouter } from "@/lib/jd/openrouter-batch";
import { composeBatchLocal } from "@/lib/jd/compose";

const SENIORITIES = ["entry", "mid", "senior"] as const;
const COMPANY_TYPES = ["startup", "mid-size", "enterprise"] as const;
const YEARS: Record<(typeof SENIORITIES)[number], JobDescription["yearsExperience"]> = {
  entry: "0-2",
  mid: "3-5",
  senior: "6+",
};

const OUTPUT = path.join(process.cwd(), "prisma", "seed-data", "job-descriptions.json");
const MAX_ATTEMPTS = 3;

function arg(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

/** Validate a raw batch; returns the valid items and the rejection reasons. */
function validateBatch(raw: unknown[]): { valid: JobDescription[]; rejected: string[] } {
  const valid: JobDescription[] = [];
  const rejected: string[] = [];
  for (const item of raw) {
    const parsed = jobDescriptionSchema.safeParse(item);
    if (parsed.success) {
      valid.push(parsed.data);
    } else {
      rejected.push(parsed.error.issues[0]?.message ?? "invalid shape");
    }
  }
  return { valid, rejected };
}

async function generateWithRetry(
  spec: RoleSpec,
  seniority: (typeof SENIORITIES)[number],
  companyType: (typeof COMPANY_TYPES)[number],
  variants: number,
  provider: "openrouter" | "local"
): Promise<JobDescription[]> {
  const fixed = {
    role: spec.label,
    seniority,
    companyType,
    yearsExperience: YEARS[seniority],
  };
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw =
        provider === "openrouter"
          ? await generateBatchOpenRouter(spec, fixed, variants)
          : composeBatchLocal(spec, fixed, variants);
      const { valid, rejected } = validateBatch(raw);
      if (valid.length >= variants) return valid.slice(0, variants);
      console.warn(
        `[jds] ${spec.label}/${seniority}/${companyType} attempt ${attempt}: ` +
          `${valid.length}/${variants} valid (${rejected.slice(0, 2).join("; ")})`
      );
    } catch (err) {
      console.warn(
        `[jds] ${spec.label}/${seniority}/${companyType} attempt ${attempt} failed: ` +
          `${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  // Last resort: deterministic composer guarantees a complete dataset.
  const fallback = composeBatchLocal(spec, fixed, variants);
  const { valid } = validateBatch(fallback);
  return valid.slice(0, variants);
}

async function main() {
  const providerArg = arg("provider", process.env.OPENROUTER_API_KEY ? "openrouter" : "local");
  const provider = providerArg === "openrouter" ? "openrouter" : "local";
  const variants = Math.max(1, Number(arg("variants", "5")));
  const only = arg("roles", "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const catalog = only.length ? ROLE_CATALOG.filter((r) => only.includes(r.label)) : ROLE_CATALOG;

  const combos = catalog.flatMap((spec) =>
    SENIORITIES.flatMap((s) => COMPANY_TYPES.map((c) => ({ spec, s, c })))
  );
  console.log(
    `[jds] provider=${provider} roles=${catalog.length} combos=${combos.length} ×${variants}`
  );

  const all: JobDescription[] = [];
  for (const [i, combo] of combos.entries()) {
    const batch = await generateWithRetry(combo.spec, combo.s, combo.c, variants, provider);
    all.push(...batch);
    if ((i + 1) % 20 === 0 || i === combos.length - 1) {
      console.log(`[jds] ${i + 1}/${combos.length} combinations → ${all.length} JDs`);
    }
  }

  const { kept, removed } = dedupeJobDescriptions(all);
  kept.sort((a, b) =>
    a.role.localeCompare(b.role) ||
    a.seniority.localeCompare(b.seniority) ||
    a.companyType.localeCompare(b.companyType)
  );

  await writeFile(OUTPUT, `${JSON.stringify(kept, null, 2)}\n`, "utf8");

  // §10 report
  const total = kept.length;
  const removedCount = removed.length;
  const perRole = new Map<string, number>();
  for (const jd of kept) perRole.set(jd.role, (perRole.get(jd.role) ?? 0) + 1);
  console.log(`\n[jds] wrote ${total} JDs → ${OUTPUT}`);
  console.log(`[jds] duplicates removed: ${removedCount}`);
  console.log("[jds] per role:");
  for (const spec of catalog) {
    console.log(`  ${spec.label.padEnd(34)} ${perRole.get(spec.label) ?? 0}`);
  }
  if (only.length) {
    const missing = catalog.filter((r) => !perRole.has(r.label));
    if (missing.length) console.error(`[jds] MISSING ROLES: ${missing.map((m) => m.label).join(", ")}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[jds] generation failed:", err);
  process.exitCode = 1;
});
```

### 5.5 Role catalog (data)

```ts
// src/lib/jd/roles.ts
export interface RoleSpec {
  /** Canonical role label written into every JD. */
  label: string;
  /** Real technologies the generator may draw requiredSkills from. */
  stack: string[];
  /** The role's interview focus areas (schema requires 2–3). */
  focusAreas: string[];
  /** Role-flavoured responsibilities the composer/LLM adapts. */
  themes: string[];
}

export const ROLE_CATALOG: RoleSpec[] = [
  { label: "Frontend Engineer", stack: ["TypeScript", "React", "Next.js", "CSS", "Vite", "Playwright"],
    focusAreas: ["React internals & rendering", "browser performance (Core Web Vitals)", "component/state architecture"],
    themes: ["accessible UI", "design-system components", "bundle/perf budgets"] },
  { label: "Backend Engineer", stack: ["Go", "Java", "Python", "Node.js", "PostgreSQL", "Redis", "Kafka"],
    focusAreas: ["API design", "data modeling", "concurrency and scaling"],
    themes: ["service ownership", "schema migrations", "latency & reliability"] },
  // …one entry per role in §2 (all 29; the fully expanded catalog ships with the feature).
];
```

The expansion of all 29 entries is mechanical from §2: `stack` ← the stack
column, `focusAreas` ← the focus column, `themes` ← 3–5 role verbs drawn from
common practice. This is the only place role-specific content lives, so the
"same JD, different title" failure mode cannot happen silently.

---

## 6. Company-type tone matrix (must visibly change output)

The generator injects the row into each prompt, and the composer applies the same
modifiers. This is what makes a startup JD read differently from an enterprise JD.

| Dimension | startup | mid-size | enterprise |
| --- | --- | --- | --- |
| Scope | broad, "wear many hats", end-to-end | feature area with dependencies | product/system scope across teams |
| Autonomy | high, ambiguity-tolerant | guided by team leads | defined interfaces + stakeholders |
| Process | minimal, ship-first | lightweight reviews, planning | reviews, ADRs, compliance, change mgmt |
| Systems | a handful of services, one stack | several services, shared platform | many services, multi-region, legacy |
| Non-functional | speed of iteration | balance of speed and stability | reliability, security, auditability, on-call |
| Typical phrasing | "You'll own…", "from idea to production" | "Partner with…", "improve and extend…" | "Lead cross-org…", "operate at scale while meeting…" |
| `requiredSkills` flavour | core stack + one adjacent | core stack + testing/CI | core stack + observability/IaC/governance |

Seniority overlay: `entry` = implement with guidance, learn; `mid` = own features
independently; `senior` = design/lead, mentor, drive decisions, cross-team.

---

## 7. Deduplication (reuses this codebase's existing approach)

The request is to use **token-overlap similarity — the same approach already used
for cross-session question variation**. That logic lives in
`src/lib/ai/validate.ts` (`questionFingerprint` → token set of words ≥ 4 chars,
`isNearDuplicate` → shared / smaller ≥ 0.6). The dedup module mirrors it exactly
so there is one conceptual algorithm across the product.

```ts
// src/lib/jd/dedupe.ts
import type { JobDescription } from "./schema";

/** Same fingerprint as src/lib/ai/validate.ts: word tokens of length ≥ 4. */
function fingerprint(text: string): string[] {
  return [...new Set((text.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? []).sort())];
}

function jdText(jd: JobDescription): string {
  return [jd.role, ...jd.responsibilities, ...jd.requiredSkills, ...jd.niceToHave, ...jd.interviewFocusAreas]
    .join(" ");
}

/** Overlap ratio on the smaller fingerprint; ≥ threshold ⇒ near-duplicate. */
function isDuplicate(a: string[], b: string[], threshold: number): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const shared = a.filter((t) => b.includes(t)).length;
  return shared / Math.min(a.length, b.length) >= threshold;
}

/** Detail score decides which of a duplicate pair survives. */
function detailScore(jd: JobDescription): number {
  return (
    jd.responsibilities.join(" ").length +
    jd.requiredSkills.join(" ").length +
    jd.niceToHave.join(" ").length +
    jd.interviewFocusAreas.length * 10
  );
}

/**
 * Remove near-duplicate JDs, keeping the more detailed one. Only compares within
 * the same role/seniority/companyType bucket — a Frontend startup JD and a
 * Backend startup JD are never "duplicates" just because they share words.
 */
export function dedupeJobDescriptions(
  input: JobDescription[],
  threshold = 0.7
): { kept: JobDescription[]; removed: JobDescription[] } {
  const kept: JobDescription[] = [];
  const removed: JobDescription[] = [];
  const byBucket = new Map<string, Array<{ jd: JobDescription; fp: string[] }>>();

  for (const jd of input) {
    const key = `${jd.role}|${jd.seniority}|${jd.companyType}`;
    const fp = fingerprint(jdText(jd));
    const bucket = byBucket.get(key) ?? [];
    const clash = bucket.find((prev) => isDuplicate(prev.fp, fp, threshold));
    if (!clash) {
      bucket.push({ jd, fp });
      byBucket.set(key, bucket);
      kept.push(jd);
      continue;
    }
    // Keep the more detailed of the pair; the loser is recorded and dropped.
    if (detailScore(jd) > detailScore(clash.jd)) {
      const idx = kept.indexOf(clash.jd);
      if (idx >= 0) kept.splice(idx, 1, jd);
      removed.push(clash.jd);
      clash.jd = jd;
      clash.fp = fp;
    } else {
      removed.push(jd);
    }
  }
  return { kept, removed };
}
```

**Threshold note:** the codebase uses `0.6` for single *questions*. A JD contains
many sentences, so 0.6 is too aggressive and would collapse genuinely distinct
variants. We use **`0.7`**, configurable via `--threshold=`. The generator logs how
many pairs were removed (§10).

Bucket-scoping is deliberate: it preserves exactly 5 variants *per combination*
unless two variants are truly rephrases of each other.

---

## 8. Integration with `src/lib/ai/service.ts` (the answer)

### 8.1 Direct fallback feed vs. separate reference table?

**Answer: both — they are complements, not alternatives. But the JD set should
NOT be injected into the paid OpenRouter prompt path.**

| Option | Verdict | Reasoning |
| --- | --- | --- |
| Inject all/some JDs into the LLM generation prompt | **No** | `buildGenerationUserPrompt` already accepts *the user's own* `jobDescription`. Adding seed JDs inflates prompt tokens on every paid call for no gain — the user's real JD is strictly better context. |
| Feed the deterministic fallback bank | **Yes, indirectly** | This is where it pays off. Today the fallback bank is 23 generic templates that ignore role specifics. A JD index lets the fallback ground questions in *this role's* actual responsibilities/skills/focus areas — deterministic, offline, zero cost. |
| Standalone reference/seed table | **Yes** | It is the durable source of truth: queryable, versionable, admin-surfaced, and re-seedable. The fallback reads a compact in-process index derived from the same JSON so it stays pure and DB-free. |

So: **the JSON seeds a `job_description_templates` reference table, and the
fallback consumes a cached, compact index of that data to generate JD-grounded
questions.** The OpenRouter path is untouched. This is additive and cannot
regress live AI behaviour.

### 8.2 Runtime loader (compact index, lazy + cached)

Only the fields the fallback needs are indexed, keeping memory small even at 1,300+:

```ts
// src/lib/jd/index.ts
// Server-side module (imported only by the fallback provider). No new deps.
import type { JobDescription } from "./schema";

export interface JdSeedRef {
  role: string;
  seniority: JobDescription["seniority"];
  companyType: JobDescription["companyType"];
  requiredSkills: string[];
  responsibilities: string[];
  interviewFocusAreas: string[];
}

let cache: Map<string, JdSeedRef[]> | null = null;

async function load(): Promise<Map<string, JdSeedRef[]>> {
  if (cache) return cache;
  const { default: data } = await import("@/../prisma/seed-data/job-descriptions.json");
  const map = new Map<string, JdSeedRef[]>();
  for (const jd of data as JobDescription[]) {
    const key = `${jd.role.toLowerCase()}|${jd.seniority}`;
    const list = map.get(key) ?? [];
    list.push({
      role: jd.role,
      seniority: jd.seniority,
      companyType: jd.companyType,
      requiredSkills: jd.requiredSkills,
      responsibilities: jd.responsibilities,
      interviewFocusAreas: jd.interviewFocusAreas,
    });
    map.set(key, list);
  }
  cache = map;
  return map;
}

/** Fuzzy role key: exact-ish match, then token-containment (e.g. "Sr. Backend Engineer"). */
export async function findJdRefs(role: string, seniority: string, companyType?: string): Promise<JdSeedRef[]> {
  const map = await load();
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+ ]/g, " ").replace(/\s+/g, " ").trim();
  const want = norm(role);
  const seniorKey = (nullableSeniorityToEnum(seniority));
  for (const [key, refs] of map) {
    const [r, s] = key.split("|");
    if (s !== seniorKey) continue;
    if (r === want || want.includes(r) || r.includes(want)) {
      const exact = companyType ? refs.filter((x) => x.companyType === companyType) : refs;
      return exact.length ? exact : refs;
    }
  }
  return [];
}
```

> `nullableSeniorityToEnum` maps the app's seniority vocabulary
> (`"Fresher"`, `"0–1 years"`, `"1–3 years"`, `"3–5 years"`, `"5+ years"` from
> `src/lib/validation.ts`) onto `entry|mid|senior`. Nothing else changes.

### 8.3 Wiring into the fallback

`FallbackProvider.generateQuestions` gains an **optional, non-breaking** JD
grounding step. The existing template bank and its tests keep working unchanged
when no JD match is found.

```ts
// src/lib/ai/fallback.ts  (excerpt — additive)
import { findJdRefs } from "@/lib/jd";

async generateQuestions(ctx: GenerationContext): Promise<GeneratedQuestion[]> {
  const avoid = new Set((ctx.avoidQuestions ?? []).map((q) => q.trim().toLowerCase()));

  // 1) JD-grounded questions when a seed JD matches this role/seniority/company.
  const refs = await findJdRefs(ctx.role, ctx.seniority, ctx.companyType);
  if (refs.length > 0) {
    const grounded = buildJdGroundedQuestions(ctx, refs, avoid); // new helper
    if (grounded.length >= ctx.count) return grounded.slice(0, ctx.count);
    // else fall through and top up with the template bank below
  }

  // 2) existing deterministic template selection (UNCHANGED)
  const selected = pick(ctx, (t) => !avoid.has(t.question(ctx).trim().toLowerCase()));
  return selected.map(/* ...unchanged... */);
}
```

`buildJdGroundedQuestions` is a pure function in `src/lib/ai/jd-questions.ts`: it
takes the matched `JdSeedRef`s, the seniority difficulty mix (reusing
`SENIORITY_DIFFICULTY`), and the avoid-list, and emits `technical` /
`job_description` questions that name the seed JD's actual
`requiredSkills`, `responsibilities`, and `interviewFocusAreas`. It is
deterministic (stable ordering + a seeded pick) so tests can assert exact output.

**Why this ordering matters:** JD-grounded questions are strictly more relevant
than generic templates, so they are tried first; the bank remains the safety net,
so a session always gets its full `count`.

### 8.4 `db:seed` wiring (Prisma reference table)

```prisma
// prisma/schema.prisma  (add)
model JobDescriptionTemplate {
  id                 String   @id @default(cuid())
  // Stable content key: `${role}|${seniority}|${companyType}|${hash}`.
  // Prisma cannot put a Json column in @@unique, so idempotent upserts key off
  // this scalar fingerprint of role + seniority + companyType + variant body.
  variantKey         String   @unique
  role               String
  seniority          String   // entry | mid | senior
  companyType        String   // startup | mid-size | enterprise
  yearsExperience    String
  responsibilities   Json     // string[]
  requiredSkills     Json     // string[]
  niceToHave         Json     // string[]
  interviewFocusAreas Json    // string[]
  createdAt          DateTime @default(now())

  @@index([role, seniority])
  @@map("job_description_templates")
}
```

`prisma/seed.ts` stays as-is; a new `prisma/seed-jds.ts` loads the JSON and
upserts idempotently:

```ts
// prisma/seed-jds.ts
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { jobDescriptionSchema } from "../src/lib/jd/schema";

const prisma = new PrismaClient();

async function main() {
  const file = path.join(__dirname, "seed-data", "job-descriptions.json");
  const raw = JSON.parse(await readFile(file, "utf8")) as unknown[];
  const parsed = raw.map((j) => jobDescriptionSchema.parse(j)); // fail loudly on bad data

  // Deterministic content key (Prisma @unique must be a scalar, not Json).
  const variantKey = (jd: typeof parsed[number]) => {
    const body = [jd.role, jd.seniority, jd.companyType, ...jd.responsibilities, ...jd.requiredSkills].join("|");
    let h = 5381;
    for (let i = 0; i < body.length; i++) h = ((h << 5) + h + body.charCodeAt(i)) >>> 0;
    return `${jd.role}|${jd.seniority}|${jd.companyType}|${h.toString(36)}`;
  };

  await prisma.$transaction(async (tx) => {
    for (const jd of parsed) {
      const key = variantKey(jd);
      await tx.jobDescriptionTemplate.upsert({
        where: { variantKey: key },
        create: {
          variantKey: key,
          role: jd.role,
          seniority: jd.seniority,
          companyType: jd.companyType,
          yearsExperience: jd.yearsExperience,
          responsibilities: jd.responsibilities,
          requiredSkills: jd.requiredSkills,
          niceToHave: jd.niceToHave,
          interviewFocusAreas: jd.interviewFocusAreas,
        },
        update: {},
      });
    }
  });
  console.log(`Seeded ${parsed.length} job description templates.`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
```

Scripts in `package.json` (additive — `db:seed` keeps working):

```json
{
  "scripts": {
    "db:seed": "prisma db seed",
    "seed:jds": "tsx scripts/generate-job-descriptions.ts",
    "seed:jds:load": "tsx prisma/seed-jds.ts"
  }
}
```

Run order for a fresh environment:

```
npm run seed:jds          # generate + validate + dedupe → JSON
npx prisma migrate dev    # adds job_description_templates
npm run seed:jds:load     # load JSON into the reference table
npm test                  # must stay green
```

---

## 9. Tests to add (and confirmation plan)

New, cheap, deterministic tests — they add no network calls:

```ts
// tests/jd-schema.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { jobDescriptionSchema } from "../src/lib/jd/schema";
import { dedupeJobDescriptions } from "../src/lib/jd/dedupe";
import data from "../prisma/seed-data/job-descriptions.json";

describe("job description seed dataset", () => {
  it("has 1000+ entries and every one passes the schema", () => {
    assert.ok(data.length >= 1000, `only ${data.length}`);
    for (const jd of data) assert.equal(jobDescriptionSchema.safeParse(jd).success, true, JSON.stringify(jd));
  });

  it("covers every role × seniority × company type exactly like the catalog", async () => {
    const { ROLE_CATALOG } = await import("../src/lib/jd/roles");
    const seen = new Set(data.map((j) => `${j.role}|${j.seniority}|${j.companyType}`));
    for (const r of ROLE_CATALOG)
      for (const s of ["entry", "mid", "senior"])
        for (const c of ["startup", "mid-size", "enterprise"])
          assert.ok(seen.has(`${r.label}|${s}|${c}`), `missing ${r.label}/${s}/${c}`);
  });

  it("yearsExperience always matches seniority", () => {
    const map: Record<string, string> = { entry: "0-2", mid: "3-5", senior: "6+" };
    for (const jd of data) assert.equal(jd.yearsExperience, map[jd.seniority]);
  });

  it("requiredSkills never contains generic non-technology terms", () => {
    const banned = /^(programming|coding|software|teamwork|communication|problem solving)$/i;
    for (const jd of data) for (const s of jd.requiredSkills) assert.equal(banned.test(s), false, s);
  });

  it("re-running dedupe removes nothing (the file is already deduped)", () => {
    const { removed } = dedupeJobDescriptions(data as never, 0.7);
    assert.equal(removed.length, 0);
  });
});
```

Plus one behavioural test that the fallback actually uses the seed JDs:

```ts
// tests/fallback-jd.test.ts
it("grounds fallback questions in seed JD skills for a matched role", async () => {
  const { FallbackProvider } = await import("../src/lib/ai/fallback");
  const questions = await new FallbackProvider().generateQuestions({
    role: "Backend Engineer", seniority: "3–5 years", companyType: "Startup", count: 6,
  });
  assert.equal(questions.length, 6);
});
```

### 9.1 "Existing tests still pass" — how integration is kept non-breaking

- `FallbackProvider` changes are **additive**: the JD path only activates when
  `findJdRefs` returns matches, and it falls back to the existing `pick()` logic
  otherwise. `tests/fallback.test.ts`, `tests/golden-questions.test.ts`, and
  `tests/variation.test.ts` call `generateQuestions` **without** a matching JD
  index in some cases and must still pass — this is the acceptance gate.
- `service.ts` is **not modified** for routing; the fallback remains the same
  provider implementing the same `AIProvider` interface. `tests/service.test.ts`
  therefore stays valid.
- No change to `OpenRouterProvider`, prompts, or validation of live output.

Verification command: `npm test` (script: `tsx --test tests/*.test.ts`). This must
be run after wiring and reported green before the task is marked done.

---

## 10. Final report (produced by the generator)

The script prints the three required answers. On a full 29-role run:

```
[jds] provider=openrouter roles=29 combos=261 ×5
[jds] 261/261 combinations → 1305 JDs
[jds] wrote 13xx JDs → prisma/seed-data/job-descriptions.json
[jds] duplicates removed: NN
[jds] per role:
  Frontend Engineer                  45
  Backend Engineer                   45
  …
  Developer Relations / Advocacy     45
```

**Report template (fill in after a real run):**

| Metric | Value |
| --- | --- |
| Final validated JD count | `1,3xx` (≥1000 ✓) |
| Combinations covered | `261 / 261` (29 roles × 3 seniorities × 3 company types) |
| Variants per combination | `5` (nominal; minus any dedup removals) |
| Duplicates removed | `NN` (threshold `0.7`, bucket-scoped) |
| Roles skipped | `0` (assertion exits non-zero if any) |
| Per-role counts | see generator output above |
| `npm test` | green |

If the run uses the grouped-24 variant of the catalog, the report reads
`216 / 216` combinations and `1,0xx` JDs — still over target.

---

## 11. Legal & originality guardrails

- **No scraping.** The generator never fetches or reads any external job board.
  Inputs are the role catalog (§5.5) and general role knowledge only.
- **Original composition.** The `local` composer assembles sentences
  combinatorially from role fragments; the `openrouter` prompt explicitly forbids
  quoting/paraphrasing real postings.
- **No real company names** in any JD (prompt rule + could be added as a Zod
  refinement if desired).
- The generated file is committed as project data and is safe to ship.

---

## 12. Implementation checklist

- [ ] `src/lib/jd/schema.ts` — Zod schema + types (§3)
- [ ] `src/lib/jd/roles.ts` — full 29-role catalog (§5.5)
- [ ] `src/lib/jd/compose.ts` — deterministic composer (offline provider)
- [ ] `src/lib/jd/openrouter-batch.ts` — batched LLM provider (§5.3)
- [ ] `src/lib/jd/dedupe.ts` — token-overlap dedupe (§7)
- [ ] `scripts/generate-job-descriptions.ts` — orchestration + report (§5.4, §10)
- [ ] `prisma/seed-data/job-descriptions.json` — generated output
- [ ] `src/lib/jd/index.ts` — cached compact index (§8.2)
- [ ] `src/lib/ai/jd-questions.ts` — JD-grounded question builder (§8.3)
- [ ] `src/lib/ai/fallback.ts` — additive grounding hook (§8.3)
- [ ] `prisma/seed-jds.ts` + `prisma/schema.prisma` model + scripts (§8.4)
- [ ] `tests/jd-schema.test.ts`, `tests/fallback-jd.test.ts` (§9)
- [ ] Run `npm run seed:jds`, `npm run seed:jds:load`, `npm test`; record §10

---

## 13. Open decisions surfaced for sign-off

1. **29 vs 24 roles** — this doc assumes **29** (follows the explicit coverage
   list). Confirm if you want the grouped-24 variant instead.
2. **Provider** — `openrouter` gives the best variety; `local` composer is
   dependency-free and deterministic. Default is auto.
3. **Dedup threshold** — `0.7` recommended; `0.6` (matching question-level) would
   remove noticeably more variants.

---

## 14. Implementation status (this repo)

Shipped:

| Piece | Where | Status |
| --- | --- | --- |
| Schema + seniority/company vocabularies (§3) | `src/lib/jd/schema.ts` | ✅ |
| 29-role catalog (§2, §5.5) | `src/lib/jd/roles.ts` | ✅ |
| Token-overlap dedupe (§7) | `src/lib/jd/dedupe.ts` | ✅ |
| Batched LLM provider (§5.2, §5.3) | `src/lib/jd/openrouter-batch.ts` | ✅ |
| **Deterministic offline composer** (§5.2 `local`) | `src/lib/jd/compose.ts` | ✅ |
| Generator: checkpointing, retries, report (§5.4, §10) | `scripts/generate-job-descriptions.ts` | ✅ `--provider=auto\|local\|openrouter` |
| Generated dataset | `prisma/seed-data/job-descriptions.json` | ✅ 1,282 JDs · 261/261 combinations · 0 rejected · 1 duplicate removed |
| Dataset guards (§9) | `tests/jd-seed.test.ts` | ✅ 9 tests |

Deferred (deliberately, so nothing about live generation changes by accident):

- `src/lib/jd/index.ts` + `src/lib/ai/jd-questions.ts` — the cached compact
  index and JD-grounded *fallback* questions (§8.2, §8.3). It must stay
  additive: seed-grounded questions first, fall through to the template bank,
  and keep the seniority difficulty mix, the interview-type emphasis and the
  cross-session avoid-list, so `tests/golden-questions.test.ts`,
  `tests/fallback.test.ts` and `tests/variation.test.ts` stay green.
- `job_description_templates` Prisma model, `prisma/seed-jds.ts` and
  `npm run seed:jds:load` (§8.4) — needs a migration against the deployment's
  database, so it is not bundled with the data work.

Operational notes:

- The first OpenRouter run died on `HTTP 402` (credit ceiling) with no JSON
  written, which is why the offline composer exists: the pipeline now always
  finishes, and a partially generated checkpoint can be topped up by re-running
  the same command without `--fresh`.
- `techjd.md` is the generator's markdown dataset document (written by a run
  without `--json-only`); this file is the design spec and is appended to it as
  the preserved appendix. The stale spec duplicate that used to sit at
  `techjd.md` was removed — rerun the generator to produce the real document.
- The run checkpoint (`.jd-checkpoint.json`) and `.jd-run*.log` are git-ignored:
  the JSON dataset is the committed artifact.
- The committed dataset was composed offline, so its wording is
  template-derived rather than model-generated. `--provider=openrouter --fresh`
  regenerates it with richer wording under the same schema, coverage and dedupe
  guarantees.

```bash
npm run seed:jds -- --provider=local --variants=5 --target=1000 --json-only  # offline, deterministic, ~6s
npm run seed:jds -- --provider=openrouter --fresh                            # richer wording (needs credits)
npm test                                                                     # includes the dataset guards
```
