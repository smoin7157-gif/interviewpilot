import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { listOwnedMocks } from "@/lib/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List every mock session the caller owns, newest first (Phase 4 history). */
export async function GET() {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mocks = await listOwnedMocks(user.id);

  return NextResponse.json({
    sessions: mocks.map((mock) => ({
      id: mock.id,
      interviewSessionId: mock.interviewSessionId,
      role: mock.role,
      company: mock.company,
      seniority: mock.seniority,
      interviewType: mock.interviewType,
      status: mock.status,
      overallScore: mock.overallScore,
      hasDebrief: mock.hasDebrief,
      questionsAsked: mock.questionsAsked,
      startedAt: mock.startedAt.toISOString(),
      endedAt: mock.endedAt?.toISOString() ?? null,
      createdAt: mock.createdAt.toISOString(),
    })),
  });
}