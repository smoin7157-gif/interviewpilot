/**
 * Paste production secrets from the old Vercel project (dashboard) into the
 * linked project — values are not echoed. Requires vercel login + link.
 */

import { createInterface } from "node:readline/promises";
import { spawnSync } from "node:child_process";
import { stdin as input, stdout as output } from "node:process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TARGETS = ["production", "preview"];

const KEYS = ["DATABASE_URL", "OPENROUTER_API_KEY", "APP_URL"];

function pushEnv(key, target, value) {
  const add = spawnSync("npx", ["vercel", "env", "add", key, target, "--force"], {
    cwd: ROOT,
    input: value,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
  });
  if (add.status !== 0) {
    console.error(`Failed ${key} (${target}):`, (add.stderr || add.stdout || "").trim());
    return false;
  }
  console.log(`OK ${key} (${target})`);
  return true;
}

async function main() {
  console.log(
    "Copy DATABASE_URL and OPENROUTER_API_KEY from:\n" +
      "  interviewpilot → Settings → Environment Variables → Production\n" +
      "Paste each value when prompted (input is hidden where supported).\n"
  );

  const rl = createInterface({ input, output });
  const values = {};

  for (const key of KEYS) {
    const answer = await rl.question(`${key}${key === "APP_URL" ? " (optional)" : ""}: `);
    const trimmed = answer.trim();
    if (!trimmed && key !== "APP_URL") {
      console.error(`Missing required ${key}`);
      process.exit(1);
    }
    if (trimmed) values[key] = trimmed;
  }
  rl.close();

  for (const [key, value] of Object.entries(values)) {
    for (const target of TARGETS) {
      if (!pushEnv(key, target, value)) process.exit(1);
    }
  }

  console.log("\nRedeploy: npx vercel deploy --prod --yes");
}

main();