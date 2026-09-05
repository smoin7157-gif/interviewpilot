import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mockEndSchema } from "@/lib/validation";
import { countMainQuestions, getOwnedMockSession } from "@/lib/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = mockEndSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid input.";
    return NextResponse.json({ error: first }, { status: 422 });
  }

  const mock = await getOwnedMockSession(user.id, id);
  if (!mock) return NextResponse.json({ error: "Mock interview not found." }, { status: 404 });

  const alreadyComplete = mock.status === "SESSION_COMPLETE";
  if (mock.status !== "ERROR" && !alreadyComplete) {
    await prisma.mockInterviewSession.update({
      where: { id: mock.id },
      data: { status: "SESSION_COMPLETE", endedAt: new Date() },
    });
  }

  const questionsAsked = countMainQuestions(mock.turns);
  return NextResponse.json({
    mockSessionId: mock.id,
    completed: true,
    questionsAsked,
    reason: parsed.data.reason,
    ended: !alreadyComplete,
  });
}
