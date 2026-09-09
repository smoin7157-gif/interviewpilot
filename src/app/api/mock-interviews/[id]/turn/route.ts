import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mockTurnSchema } from "@/lib/validation";
import { driveInterview } from "@/lib/ai/service";
import {
  buildInterviewerContext,
  countMainQuestions,
  getOwnedInterviewSession,
  getOwnedMockSession,
  turnsToHistory,
} from "@/lib/mock";
import { checkRateLimit, rateLimitError } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`mock-turn:${user.id}`, { limit: 200, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) return rateLimitError(rl.retryAfterSeconds);

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = mockTurnSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid input.";
    return NextResponse.json({ error: first }, { status: 422 });
  }

  const mock = await getOwnedMockSession(user.id, id);
  if (!mock) return NextResponse.json({ error: "Mock interview not found." }, { status: 404 });
  if (mock.status === "SESSION_COMPLETE" || mock.status === "ERROR") {
    return NextResponse.json({ error: "This mock interview is already finished." }, { status: 409 });
  }

  const interview = await getOwnedInterviewSession(user.id, mock.interviewSessionId);
  if (!interview) return NextResponse.json({ error: "Interview not found." }, { status: 404 });

  const transcript = parsed.data.transcript.trim();
  const hasOpened = mock.turns.some((t) => t.speaker === "AI");

  // The first call has no candidate audio yet — the interviewer opens.
  // Every later call must carry the candidate's spoken answer.
  if (hasOpened && transcript.length === 0) {
    return NextResponse.json(
      { error: "We didn't catch your answer — please speak again or type it below." },
      { status: 422 }
    );
  }

  const questionsAskedBefore = countMainQuestions(mock.turns);
  const ctx = buildInterviewerContext({
    role: interview.role,
    seniority: interview.seniority,
    company: interview.company,
    companyType: interview.companyType,
    interviewType: interview.interviewType,
    jobDescription: interview.jobDescription,
    resumeContext: interview.resumeContext,
    githubContext: interview.githubContext,
    projects: interview.projects,
    questions: interview.questions,
    history: turnsToHistory(mock.turns),
    questionsAsked: questionsAskedBefore,
    maxQuestions: mock.maxQuestions,
  });

  const { decision, provider, model } = await driveInterview(ctx);

  // Deterministic safety net: never exceed the main-question cap.
  const asksMain = decision.action === "ask_question" || decision.action === "move_topic";
  const completed =
    decision.action === "end_interview" || (asksMain && questionsAskedBefore + 1 > mock.maxQuestions);
  const finalAction = completed ? "end_interview" : decision.action;
  const finalText =
    completed || !decision.text.trim()
      ? `That's all the questions I have for today. Thank you for practicing with InterviewOS — best of luck in your real interview!`
      : decision.text;

  const aiTurnIndex = mock.turns.length + (hasOpened && transcript ? 1 : 0);

  await prisma.$transaction(async (tx) => {
    if (hasOpened && transcript) {
      await tx.interviewTurn.create({
        data: {
          mockSessionId: mock.id,
          turnIndex: mock.turns.length,
          speaker: "CANDIDATE",
          transcript,
        },
      });
    }
    await tx.interviewTurn.create({
      data: {
        mockSessionId: mock.id,
        turnIndex: aiTurnIndex,
        speaker: "AI",
        transcript: finalText,
        action: finalAction,
        category: decision.category ?? null,
        difficulty: decision.difficulty ?? null,
      },
    });
    await tx.mockInterviewSession.update({
      where: { id: mock.id },
      data: completed
        ? { status: "SESSION_COMPLETE", endedAt: new Date() }
        : { status: "QUESTION_COMPLETE" },
    });
  });

  return NextResponse.json({
    action: finalAction,
    text: finalText,
    category: decision.category ?? null,
    difficulty: decision.difficulty ?? null,
    reason: decision.reason ?? null,
    questionNumber: questionsAskedBefore + (asksMain && !completed ? 1 : 0),
    maxQuestions: mock.maxQuestions,
    completed,
    provider,
    model: model ?? null,
  });
}
