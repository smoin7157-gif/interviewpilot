import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { countMainQuestions, getOwnedMockSession } from "@/lib/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const mock = await getOwnedMockSession(user.id, id);
  if (!mock) return NextResponse.json({ error: "Mock interview not found." }, { status: 404 });

  return NextResponse.json({
    id: mock.id,
    interviewSessionId: mock.interviewSessionId,
    status: mock.status,
    maxQuestions: mock.maxQuestions,
    overallScore: mock.overallScore,
    startedAt: mock.startedAt.toISOString(),
    endedAt: mock.endedAt?.toISOString() ?? null,
    questionsAsked: countMainQuestions(mock.turns),
    turns: mock.turns.map((t) => ({
      speaker: t.speaker,
      text: t.transcript,
      action: t.action,
      category: t.category,
      difficulty: t.difficulty,
    })),
  });
}
