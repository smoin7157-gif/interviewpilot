/**
 * JD seed generator (techjd).
 *
 * Generates 2000+ original software job descriptions by looping every
 * role × seniority × companyType combination, requesting a batch per combo,
 * validating each object against the Zod schema, and retrying the gaps.
 *
 *   - Resumable: valid results are checkpointed per combo, so a re-run resumes.
 *   - Validated: nothing is written unless it passes jobDescriptionSchema.
 *   - Deduped: token-overlap pass (same approach as question variation).
 *   - Outputs: prisma/seed-data/job-descriptions.json + techjd.md (dataset).
 *
 * Usage:
 *   npx tsx scripts/generate-job-descriptions.ts [--variants=12] [--limit=N]
 *     [--roles=A,B] [--model=openai/gpt-4o-mini] [--concurrency=6]
 *     [--target=2050] [--threshold=0.7] [--fresh] [--json-only]
 *     [--provider=auto|local|openrouter]
 *
 * Providers:
 *   openrouter  best variety; needs OPENROUTER_API_KEY (and credits)
 *   local       deterministic offline composer; no key, no network, instant
 *   auto        openrouter when a key is present, otherwise local (default)
 *
 * The local composer guarantees the dataset always finishes — a run that runs
 * out of credits mid-way can be completed offline and re-run with OpenRouter
 * later for richer wording.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  jobDescriptionSchema,
  SENIORITIES,
  COMPANY_TYPES,
  YEARS_BY_SENIORITY,
  type CompanyType,
  type JobDescription,
  type Seniority,
} from "../src/lib/jd/schema";
import {
  ROLE_CATALOG,
  SENIORITY_LABEL,
  COMPANY_TYPE_LABEL,
  type RoleSpec,
} from "../src/lib/jd/roles";
import { dedupeJobDescriptions } from "../src/lib/jd/dedupe";
import { generateBatch, type FixedAxis, type ProviderConfig } from "../src/lib/jd/openrouter-batch";
import { composeBatchLocal } from "../src/lib/jd/compose";

const ROOT = process.cwd();
const SEED_DIR = path.join(ROOT, "prisma", "seed-data");
const JSON_OUT = path.join(SEED_DIR, "job-descriptions.json");
const MD_OUT = path.join(ROOT, "techjd.md");
const SPEC_FILE = path.join(ROOT, "techjd-spec.md");
const CHECKPOINT = path.join(SEED_DIR, ".jd-checkpoint.json");

/* ------------------------------- CLI / env ------------------------------- */

function arg(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

type ProviderChoice = "openrouter" | "local";

/** Which backend to use: `auto` prefers OpenRouter when a key is configured. */
function resolveProvider(requested: string, hasKey: boolean): ProviderChoice {
  if (requested === "local") return "local";
  if (requested === "openrouter") {
    if (!hasKey) throw new Error("--provider=openrouter needs OPENROUTER_API_KEY (add it to .env, or use --provider=local).");
    return "openrouter";
  }
  if (requested !== "auto") throw new Error(`unknown --provider=${requested} (expected auto, local or openrouter)`);
  return hasKey ? "openrouter" : "local";
}

/**
 * One batch of raw (unvalidated) JD objects for a single axis. `startIndex` is
 * how many variants this combo already has — the offline composer uses it to
 * keep numbering continuous, while the LLM provider ignores it (its variety
 * comes from the prompt and `guidance`).
 */
type BatchGenerator = (
  spec: RoleSpec,
  fixed: FixedAxis,
  variants: number,
  guidance: string | undefined,
  startIndex: number
) => Promise<unknown[]>;

/** Minimal .env loader (tsx does not auto-load it). Existing env wins. */
async function loadEnv(): Promise<void> {
  try {
    const text = await readFile(path.join(ROOT, ".env"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!m) continue;
      let value = m[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = value;
    }
  } catch {
    /* no .env — rely on the real environment */
  }
}

/* ------------------------------- helpers -------------------------------- */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function comboKey(role: string, s: Seniority, c: CompanyType): string {
  return `${role}|${s}|${c}`;
}

interface Combo {
  spec: RoleSpec;
  seniority: Seniority;
  companyType: CompanyType;
  key: string;
}

function buildCombos(catalog: RoleSpec[]): Combo[] {
  const combos: Combo[] = [];
  for (const spec of catalog) {
    for (const seniority of SENIORITIES) {
      for (const companyType of COMPANY_TYPES) {
        combos.push({ spec, seniority, companyType, key: comboKey(spec.label, seniority, companyType) });
      }
    }
  }
  return combos;
}

/** Validate raw objects and forward-fix axis fields the model may drift on. */
function validateBatch(raw: unknown[], combo: Combo): { valid: JobDescription[]; rejected: string[] } {
  const valid: JobDescription[] = [];
  const rejected: string[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      rejected.push("not an object");
      continue;
    }
    const candidate = {
      ...(item as Record<string, unknown>),
      // Pin the fixed axis so a good JD is never rejected for a labelling slip.
      role: combo.spec.label,
      seniority: combo.seniority,
      companyType: combo.companyType,
      yearsExperience: YEARS_BY_SENIORITY[combo.seniority],
    };
    const parsed = jobDescriptionSchema.safeParse(candidate);
    if (parsed.success) {
      valid.push(parsed.data);
    } else {
      rejected.push(parsed.error.issues[0]?.message ?? "invalid");
    }
  }
  return { valid, rejected };
}

/** Deduplicate a batch against itself (and anything already accepted). */
function uniqueAgainst(batch: JobDescription[], existing: JobDescription[], threshold: number): JobDescription[] {
  const { kept } = dedupeJobDescriptions([...existing, ...batch], threshold);
  const existingSet = new Set(existing.map((j) => JSON.stringify(j)));
  return kept.filter((j) => !existingSet.has(JSON.stringify(j)));
}

/* --------------------------- checkpoint storage -------------------------- */

let checkpointLock: Promise<unknown> = Promise.resolve();
async function saveCheckpoint(map: Map<string, JobDescription[]>): Promise<void> {
  const snapshot = JSON.stringify(Object.fromEntries(map));
  checkpointLock = checkpointLock.then(() =>
    writeFile(CHECKPOINT, snapshot, "utf8").catch(() => undefined)
  );
  await checkpointLock;
}

async function loadCheckpoint(): Promise<Map<string, JobDescription[]>> {
  try {
    const raw = JSON.parse(await readFile(CHECKPOINT, "utf8")) as Record<string, JobDescription[]>;
    return new Map(Object.entries(raw));
  } catch {
    return new Map();
  }
}

/* ------------------------------- generation ------------------------------ */

interface RunStats {
  combosDone: number;
  combosTotal: number;
  apiCalls: number;
  rejected: number;
  startedAt: number;
}

async function generateCombo(
  generate: BatchGenerator,
  combo: Combo,
  want: number,
  threshold: number,
  maxAttempts: number,
  stats: RunStats,
  existing: JobDescription[] = []
): Promise<JobDescription[]> {
  const fixed: FixedAxis = {
    role: combo.spec.label,
    seniority: combo.seniority,
    companyType: combo.companyType,
    yearsExperience: YEARS_BY_SENIORITY[combo.seniority],
  };
  const accepted: JobDescription[] = [...existing];
  let guidance: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts && accepted.length < want; attempt++) {
    const need = want - accepted.length;
    try {
      stats.apiCalls += 1;
      const raw = await generate(combo.spec, fixed, need, guidance, accepted.length);
      const { valid, rejected } = validateBatch(raw, combo);
      stats.rejected += rejected.length;
      accepted.push(...uniqueAgainst(valid, accepted, threshold));
      if (rejected.length > 0 && accepted.length < want) {
        guidance =
          "Some previous objects were rejected. Ensure every responsibility is a specific 15+ character sentence, " +
          "requiredSkills are real technologies only (never 'programming'/'coding'/'software'/soft skills), " +
          "and niceToHave has 2-4 items.";
      }
      if (accepted.length < want && attempt < maxAttempts) await sleep(600);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[jds] ${combo.key} attempt ${attempt} failed: ${msg}`);
      if (attempt < maxAttempts) await sleep(2_000 * attempt);
    }
  }
  return accepted;
}

/** Run promises with bounded concurrency. */
async function pool<T>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<void>): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

/* ------------------------------- markdown -------------------------------- */

function renderDatasetMd(kept: JobDescription[], removed: number, byRole: Map<string, number>): string {
  const now = new Date().toISOString().slice(0, 10);
  const out: string[] = [];
  out.push(`# techjd.md — InterviewOS Original Job Description Dataset`);
  out.push(``);
  out.push(`> **${kept.length} original software job descriptions** generated for InterviewOS.`);
  out.push(`> Every entry is written from scratch from common industry practice — nothing is scraped,`);
  out.push(`> copied, or paraphrased from LinkedIn, Indeed, Naukri, or any job board.`);
  out.push(`>`);
  out.push(`> Generated: ${now} · Roles: ${ROLE_CATALOG.length} · Seniorities: 3 · Company types: 3`);
  out.push(`> Duplicates removed in the dedup pass: **${removed}**`);
  out.push(``);
  out.push(`Machine-readable source of truth: \`prisma/seed-data/job-descriptions.json\`.`);
  out.push(``);
  out.push(`## Schema`);
  out.push(``);
  out.push("```ts");
  out.push(`{`);
  out.push(`  role: string;                     // e.g. "Backend Engineer", "iOS Engineer"`);
  out.push(`  seniority: "entry" | "mid" | "senior";`);
  out.push(`  companyType: "startup" | "mid-size" | "enterprise";`);
  out.push(`  responsibilities: string[];       // 3-5 specific items`);
  out.push(`  requiredSkills: string[];         // 3-12 real technologies`);
  out.push(`  niceToHave: string[];             // 2-4 items`);
  out.push(`  yearsExperience: "0-2" | "3-5" | "6+";`);
  out.push(`  interviewFocusAreas: string[];    // 2-3 areas`);
  out.push(`}`);
  out.push("```");
  out.push(``);
  out.push(`## Coverage by role`);
  out.push(``);
  out.push(`| Role | JDs |`);
  out.push(`| --- | ---: |`);
  for (const spec of ROLE_CATALOG) out.push(`| ${spec.label} | ${byRole.get(spec.label) ?? 0} |`);
  out.push(`| **Total** | **${kept.length}** |`);
  out.push(``);
  out.push(`---`);
  out.push(``);
  out.push(`## Dataset`);
  out.push(``);

  for (const spec of ROLE_CATALOG) {
    const rows = kept.filter((j) => j.role === spec.label);
    if (rows.length === 0) continue;
    out.push(`### ${spec.label}`);
    out.push(``);
    for (const seniority of SENIORITIES) {
      for (const companyType of COMPANY_TYPES) {
        const bucket = rows.filter((j) => j.seniority === seniority && j.companyType === companyType);
        if (bucket.length === 0) continue;
        out.push(`#### ${SENIORITY_LABEL[seniority]} · ${COMPANY_TYPE_LABEL[companyType]} — ${bucket.length} variants`);
        out.push(``);
        bucket.forEach((jd, i) => {
          out.push(`**${i + 1}. ${jd.role} (${jd.yearsExperience} yrs)**`);
          out.push(``);
          out.push(`- **Responsibilities**`);
          for (const r of jd.responsibilities) out.push(`  - ${r}`);
          out.push(`- **Required skills:** ${jd.requiredSkills.join(", ")}`);
          out.push(`- **Nice to have:** ${jd.niceToHave.join(", ")}`);
          out.push(`- **Interview focus:** ${jd.interviewFocusAreas.join("; ")}`);
          out.push(``);
        });
      }
    }
  }
  return out.join("\n");
}

async function assembleMarkdown(kept: JobDescription[], removed: number, byRole: Map<string, number>): Promise<void> {
  const dataset = renderDatasetMd(kept, removed, byRole);
  let appendix = "";
  try {
    const spec = await readFile(SPEC_FILE, "utf8");
    appendix = [
      ``,
      `---`,
      ``,
      `# Appendix — preserved implementation spec`,
      ``,
      `_This is the original version of this file (the technical design + integration spec),`,
      `kept verbatim so nothing previously delivered is lost. The dataset above was added to it._`,
      ``,
      spec.trimStart(),
    ].join("\n");
  } catch {
    /* spec snapshot absent — dataset-only file */
  }
  await writeFile(MD_OUT, `${dataset}${appendix}\n`, "utf8");
}

/* --------------------------------- main ---------------------------------- */

async function main(): Promise<void> {
  await loadEnv();
  await mkdir(SEED_DIR, { recursive: true });

  const variants = Math.max(1, Number(arg("variants", "12")));
  const target = Math.max(1, Number(arg("target", "2050")));
  const threshold = Number(arg("threshold", "0.7"));
  const concurrency = Math.max(1, Number(arg("concurrency", "6")));
  const limit = Number(arg("limit", "0"));
  const fresh = flag("fresh");
  const jsonOnly = flag("json-only");
  const only = arg("roles", "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const apiKey = process.env.OPENROUTER_API_KEY ?? "";
  const provider = resolveProvider(arg("provider", "auto"), apiKey !== "");

  const cfg: ProviderConfig = {
    apiKey,
    baseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
    model: arg("model", process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini"),
    temperature: 0.9,
    // A lower cap reduces the per-request credit reservation, which matters on a
    // low-balance key where concurrent large requests trigger HTTP 402.
    maxTokens: Math.max(1_000, Number(arg("max-tokens", "5000"))),
  };

  // Same schema on both backends — only where the raw objects come from changes.
  const generate: BatchGenerator =
    provider === "openrouter"
      ? (spec, fixed, variants, guidance) => generateBatch(cfg, spec, fixed, variants, guidance)
      : (spec, fixed, variants, _guidance, startIndex) =>
          Promise.resolve(composeBatchLocal(spec, fixed, variants, startIndex));

  const catalog = only.length ? ROLE_CATALOG.filter((r) => only.includes(r.label)) : ROLE_CATALOG;
  if (catalog.length === 0) throw new Error(`no roles matched --roles=${only.join(",")}`);

  let combos = buildCombos(catalog);
  if (limit > 0) combos = combos.slice(0, limit);

  console.log(
    `[jds] provider=${provider}${provider === "openrouter" ? ` model=${cfg.model}` : " model=compose"} ` +
      `roles=${catalog.length} combos=${combos.length} variants=${variants} concurrency=${concurrency}`
  );

  const checkpoint = fresh ? new Map<string, JobDescription[]>() : await loadCheckpoint();
  // A combo is only complete when it holds at least `variants` valid JDs, so a
  // restart tops up combos that fell short instead of skipping them.
  const existingCount = (c: Combo) => checkpoint.get(c.key)?.length ?? 0;
  const done = combos.filter((c) => existingCount(c) >= variants);
  const todo = combos.filter((c) => existingCount(c) < variants);
  console.log(`[jds] resuming: ${done.length} combos already complete, ${todo.length} to generate/top-up`);

  const stats: RunStats = { combosDone: done.length, combosTotal: combos.length, apiCalls: 0, rejected: 0, startedAt: Date.now() };

  await pool(todo, concurrency, async (combo) => {
    const existing = checkpoint.get(combo.key) ?? [];
    const results = await generateCombo(generate, combo, variants, threshold, 3, stats, existing);
    checkpoint.set(combo.key, results);
    // Local copy of the counter: with several workers in flight the shared
    // value can advance past this combo before the log line is written, which
    // used to print the same "N/N combos" line once per finishing worker.
    const finished = (stats.combosDone += 1);
    await saveCheckpoint(checkpoint);
    if (finished % 10 === 0 || finished === stats.combosTotal) {
      const total = [...checkpoint.values()].reduce((n, v) => n + v.length, 0);
      console.log(`[jds] ${finished}/${stats.combosTotal} combos · ${total} raw JDs · ${stats.apiCalls} calls`);
    }
  });

  // Flatten + dedupe.
  let all: JobDescription[] = [];
  for (const combo of combos) all.push(...(checkpoint.get(combo.key) ?? []));
  let { kept, removed, removalLog } = dedupeJobDescriptions(all, threshold);
  console.log(`[jds] raw=${all.length} kept=${kept.length} removed=${removed.length}`);

  // Top-up: if we are short of target, generate extra variants for the thinnest
  // combos until we clear it (guards against an aggressive dedupe pass).
  let round = 0;
  while (kept.length < target && round < 4) {
    round += 1;
    const deficit = target - kept.length;
    const counts = new Map<string, number>();
    for (const jd of kept) {
      const k = comboKey(jd.role, jd.seniority, jd.companyType);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const thinnest = [...combos]
      .sort((a, b) => (counts.get(a.key) ?? 0) - (counts.get(b.key) ?? 0))
      .slice(0, Math.max(5, Math.ceil(deficit / 3)));
    console.log(`[jds] top-up round ${round}: short by ${deficit}, generating ${thinnest.length} more combos`);
    await pool(thinnest, concurrency, async (combo) => {
      const existing = checkpoint.get(combo.key) ?? [];
      const extra = await generateCombo(generate, combo, existing.length + 3, threshold, 2, stats, existing);
      checkpoint.set(combo.key, extra);
      await saveCheckpoint(checkpoint);
    });
    all = [];
    for (const combo of combos) all.push(...(checkpoint.get(combo.key) ?? []));
    ({ kept, removed, removalLog } = dedupeJobDescriptions(all, threshold));
    console.log(`[jds] after top-up ${round}: kept=${kept.length} removed=${removed.length}`);
  }

  kept.sort(
    (a, b) =>
      a.role.localeCompare(b.role) ||
      SENIORITIES.indexOf(a.seniority) - SENIORITIES.indexOf(b.seniority) ||
      COMPANY_TYPES.indexOf(a.companyType) - COMPANY_TYPES.indexOf(b.companyType)
  );

  await writeFile(JSON_OUT, `${JSON.stringify(kept, null, 2)}\n`, "utf8");

  const byRole = new Map<string, number>();
  for (const jd of kept) byRole.set(jd.role, (byRole.get(jd.role) ?? 0) + 1);

  if (!jsonOnly) await assembleMarkdown(kept, removed.length, byRole);

  const elapsed = Math.round((Date.now() - stats.startedAt) / 1000);
  console.log(`\n[jds] ================= FINAL REPORT =================`);
  console.log(`[jds] total JDs written      : ${kept.length}`);
  console.log(`[jds] target                 : ${target} (${kept.length >= target ? "MET" : "NOT MET"})`);
  console.log(`[jds] duplicates removed     : ${removed.length}`);
  for (const line of removalLog.slice(0, 5)) console.log(`[jds]   ${line}`);
  if (removalLog.length > 5) console.log(`[jds]   … ${removalLog.length - 5} more`);
  console.log(`[jds] objects rejected       : ${stats.rejected}`);
  console.log(`[jds] API calls              : ${stats.apiCalls} in ${elapsed}s`);
  console.log(`[jds] JSON                   : ${path.relative(ROOT, JSON_OUT)}`);
  if (!jsonOnly) console.log(`[jds] markdown               : ${path.relative(ROOT, MD_OUT)}`);
  console.log(`[jds] per role:`);
  let missing = 0;
  for (const spec of catalog) {
    const n = byRole.get(spec.label) ?? 0;
    if (n === 0) missing += 1;
    console.log(`  ${spec.label.padEnd(34)} ${n}`);
  }
  if (missing > 0) {
    console.error(`[jds] MISSING ROLES: ${missing}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[jds] generation failed:", err);
  process.exitCode = 1;
});
