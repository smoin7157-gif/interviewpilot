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
export async function GET() {
  const checkedAt = new Date().toISOString();
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error("[health] database check failed", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "unreachable",
        checkedAt,
        hint: "DATABASE_URL is missing, blank, or pointing at an unreachable database. See the server logs for the exact reason.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: "ok",
    database: "reachable",
    latencyMs: Date.now() - startedAt,
    checkedAt,
  });
}
