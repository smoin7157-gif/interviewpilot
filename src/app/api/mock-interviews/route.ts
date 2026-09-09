import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mockCreateSchema } from "@/lib/validation";
import { getActiveMock, getOwnedInterviewSession, TERMINAL_STATUSES } from "@/lib/mock";
import { checkRateLimit, rateLimitError } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`mock-create:${user.id}`, { limit: 20, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) return rateLimitError(rl.retryAfterSeconds);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = mockCreateSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid input.";
    return NextResponse.json({ error: first }, { status: 422 });
  }

  const session = await getOwnedInterviewSession(user.id, parsed.data.interviewSessionId);
  if (!session) return NextResponse.json({ error: "Interview not found." }, { status: 404 });
  if (session.questions.length === 0) {
    return NextResponse.json(
      { error: "Generate questions for this interview before starting a mock." },
      { status: 422 }
    );
  }

  // Idempotent: resume an in-progress mock for this interview when one exists.
  const active = await getActiveMock(user.id, session.id);
  if (active) {
    return NextResponse.json({
      mockSessionId: active.id,
      status: active.status,
      resumed: true,
      maxQuestions: active.maxQuestions,
      questionsAsked: 0, // computed on first turn fetch if the client needs it
    });
  }

  const maxQuestions = Math.min(
    parsed.data.maxQuestions,
    Math.max(4, session.questionCountTarget || session.questions.length)
  );

  const mock = await prisma.mockInterviewSession.create({
    data: {
      userId: user.id,
      interviewSessionId: session.id,
      status: "SESSION_STARTED",
      maxQuestions,
    },
    select: { id: true, status: true, maxQuestions: true },
  });

  return NextResponse.json(
    {
      mockSessionId: mock.id,
      status: mock.status,
      resumed: false,
      maxQuestions: mock.maxQuestions,
      questionsAsked: 0,
    },
    { status: 201 }
  );
}

/** Find an in-progress mock for a given interview session. */
export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const interviewSessionId = searchParams.get("interviewSessionId")?.trim();
  if (!interviewSessionId) {
    return NextResponse.json({ error: "interviewSessionId is required." }, { status: 422 });
  }

  const active = await prisma.mockInterviewSession.findFirst({
    where: {
      userId: user.id,
      interviewSessionId,
      status: { notIn: [...TERMINAL_STATUSES] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      turns: { orderBy: { turnIndex: "asc" as const }, take: 4 },
    },
  });

  if (!active) return NextResponse.json({ active: null });

  const aiTurns = active.turns.filter((t) => t.speaker === "AI");
  const lastAi = aiTurns[aiTurns.length - 1] ?? null;

  return NextResponse.json({
    active: {
      mockSessionId: active.id,
      status: active.status,
      maxQuestions: active.maxQuestions,
      questionsAsked: active.turns.filter(
        (t) => t.speaker === "AI" && (t.action === "ask_question" || t.action === "move_topic")
      ).length,
      lastQuestion: lastAi ? { text: lastAi.transcript, category: lastAi.category, difficulty: lastAi.difficulty } : null,
    },
  });
}
