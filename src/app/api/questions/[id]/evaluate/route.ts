import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { evaluateAnswer } from "@/lib/ai/service";
import { evaluateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

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
  const parsed = evaluateSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid input.";
    return NextResponse.json({ error: first }, { status: 422 });
  }

  const question = await prisma.interviewQuestion.findFirst({
    where: { id, session: { userId: user.id } },
    include: {
      session: {
        select: { role: true, seniority: true, company: true, jobDescription: true },
      },
    },
  });
  if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });

  const prompt = parsed.data.prompt && parsed.data.prompt.length > 0 ? parsed.data.prompt : question.question;
  // Only pass the suggested answer as reference when the user practiced the main question itself.
  const suggestedAnswer = prompt === question.question ? question.suggestedAnswer : undefined;

  const { result, provider, model } = await evaluateAnswer({
    prompt,
    suggestedAnswer,
    answer: parsed.data.answer,
    role: question.session.role,
  });

  const attempt = await prisma.$transaction(async (tx) => {
    const created = await tx.questionAttempt.create({
      data: {
        userId: user.id,
        questionId: question.id,
        prompt,
        answer: parsed.data.answer,
        score: result.score,
        feedback: {
          strengths: result.strengths,
          missing: result.missing,
          improvements: result.improvements,
        },
      },
      select: { id: true, createdAt: true },
    });
    await tx.interviewQuestion.update({
      where: { id: question.id },
      data: { status: "PRACTICED" },
    });
    await tx.interviewSession.update({
      where: { id: question.sessionId },
      data: { updatedAt: new Date() },
    });
    return created;
  });

  return NextResponse.json({
    attemptId: attempt.id,
    score: result.score,
    strengths: result.strengths,
    missing: result.missing,
    improvements: result.improvements,
    provider,
    model: model ?? null,
  });
}
