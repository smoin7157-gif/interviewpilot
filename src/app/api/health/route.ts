import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deploy wiring check: `GET /api/health` answers 200 only when the app can
 * actually reach its database, which is the fastest way to confirm a Vercel
 * deployment has a working `DATABASE_URL` (the failure that bypasses a generic
 * "the page is up" probe).
 *
 * Unauthenticated on purpose — a monitor has no session. Response detail is
 * therefore deliberately thin: the real error is logged server-side, while the
 * body only says whether the DB answered.
 */

/**
 * A health probe must answer. Without a budget, a database that accepts the
 * connection and then stalls leaves the request open until the platform kills
 * the function — the monitor only learns that the check timed out later, with
 * no body to explain it. Bounding the probe turns that into a prompt 503.
 */
const HEALTH_TIMEOUT_MS = 5_000;

/**
 * Never let a probe be cached. A stored 200 would keep reporting a dead
 * database as healthy (and a stored 503 would outlive the outage), so every
 * response — success or failure — is explicitly uncacheable.
 */
const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

async function assertDatabaseResponds(): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Database health check timed out after ${HEALTH_TIMEOUT_MS}ms`)),
          HEALTH_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function GET() {
  const checkedAt = new Date().toISOString();
  const startedAt = Date.now();

  try {
    await assertDatabaseResponds();
  } catch (error) {
    console.error("[health] database check failed", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "unreachable",
        checkedAt,
        hint: "DATABASE_URL is missing, blank, or pointing at an unreachable database. See the server logs for the exact reason.",
      },
      { status: 503, headers: NO_STORE }
    );
  }

  return NextResponse.json(
    {
      status: "ok",
      database: "reachable",
      latencyMs: Date.now() - startedAt,
      checkedAt,
    },
    { headers: NO_STORE }
  );
}
