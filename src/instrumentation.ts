/**
 * Startup hook (Next.js instrumentation convention).
 *
 * `register()` runs once when a server instance is created and must finish
 * before the server accepts traffic — the only place in the App Router where a
 * genuine "validate the environment at boot" check can live. It calls
 * `assertEnv()`, so a deploy with a missing or blank variable fails loudly at
 * startup instead of throwing a 500 on the first request.
 *
 * Two guards keep it away from `next build`:
 * - the check is Node-only (Edge bundles must not pull in Zod/Node env shapes),
 * - `NEXT_PHASE === "phase-production-build"` covers page-data collection,
 *   where runtime env vars legitimately aren't present (Vercel bakes them into
 *   the deployment, not the build) and a failure would break the build itself.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { assertEnv } = await import("./lib/env");
  assertEnv();
}
