/**
 * Push non-empty variables from .env into a Vercel project (production + preview).
 * Never prints secret values. Requires: vercel CLI logged in, project linked in cwd.
 *
 * Usage: node scripts/push-vercel-env.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = resolve(ROOT, ".env");

const KEYS = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "OPENROUTER_API_KEY",
  "OPENROUTER_MODEL",
  "OPENROUTER_CHEAP_MODEL",
  "GITHUB_TOKEN",
  "APP_URL",
  "GOOGLE_SITE_VERIFICATION",
  "BING_SITE_VERIFICATION",
  "NEXT_PUBLIC_GA_ID",
  "INDEXNOW_KEY",
  "OPENROUTER_BASE_URL",
];

function parseDotEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

if (!existsSync(ENV_PATH)) {
  console.error("No .env file — copy .env.example and fill required values first.");
  process.exit(1);
}

const parsed = parseDotEnv(readFileSync(ENV_PATH, "utf8"));
const targets = ["production", "preview", "development"];

for (const key of KEYS) {
  const value = parsed[key]?.trim();
  if (!value) continue;
  if (key === "DATABASE_URL" && /localhost|127\.0\.0\.1|prisma dev/i.test(value)) {
    console.warn(
      "Skip DATABASE_URL — local Prisma Dev URL. Add Neon pooler URL in Vercel dashboard first."
    );
    continue;
  }

  for (const target of targets) {
    const add = spawnSync(
      "npx",
      ["vercel", "env", "add", key, target, "--force"],
      {
        cwd: ROOT,
        input: value,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
        shell: true,
      }
    );

    if (add.status === 0) {
      console.log(`Set ${key} (${target})`);
    } else {
      const err = (add.stderr || add.stdout || "").trim();
      console.error(`Failed ${key} (${target}): ${err || "unknown error"}`);
    }
  }
}

console.log("Done. Redeploy production so the build picks up env vars.");