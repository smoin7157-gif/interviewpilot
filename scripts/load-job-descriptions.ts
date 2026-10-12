/**
 * JD seed loader (Phase 6).
 *
 * Loads the committed job-description dataset
 * (`prisma/seed-data/job-descriptions.json`) into the `job_description_templates`
 * table so the set is queryable/versionable server-side. The JSON file stays
 * the source of truth: the load is a full replace inside one transaction, so
 * re-running it is idempotent and always converges on the committed dataset.
 *
 *   - Validated: every entry must pass jobDescriptionSchema (via
 *     `buildLoadPlan`); malformed entries abort the load with their index and
 *     the failing field — never silently dropped.
 *   - Verified first: `--verify-only` validates and reports without touching
 *     the database (used in checks and when regenerating the dataset).
 *
 * Usage:
 *   npm run seed:jds:load [-- --verify-only]
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { buildLoadPlan } from "../src/lib/jd/load";

const ROOT = process.cwd();
const JSON_IN = path.join(ROOT, "prisma", "seed-data", "job-descriptions.json");
const BATCH_SIZE = 500;

const flag = (name: string) => process.argv.includes(`--${name}`);

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

async function main(): Promise<void> {
  const verifyOnly = flag("verify-only");

  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(JSON_IN, "utf8"));
  } catch (err) {
    throw new Error(
      `cannot read ${path.relative(ROOT, JSON_IN)}: ${err instanceof Error ? err.message : String(err)} ` +
        `(run \`npm run seed:jds\` to regenerate the dataset first)`
    );
  }
  if (!Array.isArray(raw)) throw new Error(`${path.relative(ROOT, JSON_IN)} is not an array`);

  const { rows, rejected } = buildLoadPlan(raw);
  console.log(`dataset: ${raw.length} entries → ${rows.length} valid, ${rejected.length} invalid`);

  if (rejected.length > 0) {
    for (const r of rejected.slice(0, 20)) {
      console.error(`  #${r.index}: ${r.reason}`);
    }
    if (rejected.length > 20) console.error(`  …and ${rejected.length - 20} more`);
    throw new Error(`${rejected.length} malformed entries — refusing to load (regenerate with \`npm run seed:jds\`)`);
  }

  const combos = new Set(rows.map((r) => `${r.role}|${r.seniority}|${r.companyType}`));
  console.log(`combos covered: ${combos.size}`);

  if (verifyOnly) {
    console.log("verify-only: database untouched");
    return;
  }

  await loadEnv();
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (add it to .env or the environment)");

  const prisma = new PrismaClient();
  try {
    // Full replace in one transaction: the table is a derived copy of the
    // committed JSON, so this is idempotent and self-healing on re-runs.
    const counts = await prisma.$transaction(async (tx) => {
      const removed = await tx.jobDescriptionTemplate.deleteMany();
      let created = 0;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const res = await tx.jobDescriptionTemplate.createMany({ data: rows.slice(i, i + BATCH_SIZE) });
        created += res.count;
      }
      return { removed: removed.count, created };
    });
    console.log(`loaded ${counts.created} rows into job_description_templates (replaced ${counts.removed} previous rows)`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
