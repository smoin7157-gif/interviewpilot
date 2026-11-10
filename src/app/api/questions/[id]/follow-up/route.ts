import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateFollowUps } from "@/lib/ai/service";
import { checkRateLimit, rateLimitError } from "@/lib/rate-limit";
import { answerFollowUpSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * One written follow-up that reacts to the candidate's actual answer.
 *
 * The stored follow-ups are generated up front with the question; this route is
 * the on-demand counterpart for the answer a candidate has just written. It
 * shares `generateFollowUps` with the live path, so the prompt rules (reference
 * a specific claim, never assume depth that a thin answer did not show) and the
 * deterministic fallback are identical.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Its own bucket: probing an answer must not consume the evaluation or mock
  // budget, and a busy evaluation session must not lock this out.
  const rl = checkRateLimit(`followup:${user.id}`, { limit: 60, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) return rateLimitError(rl.retryAfterSeconds);

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = answerFollowUpSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid input.";
    return NextResponse.json({ error: first }, { status: 422 });
  }

  const question = await prisma.interviewQuestion.findFirst({
    where: { id, session: { userId: user.id } },
    select: {
      question: true,
      session: {
        select: {
          role: true,
          seniority: true,
          company: true,
          companyType: true,
          interviewType: true,
          jobDescription: true,
        },
      },
    },
  });
  if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });

  const { followUps, provider, model } = await generateFollowUps({
    question: question.question,
    role: question.session.role,
    seniority: question.session.seniority,
    company: question.session.company ?? undefined,
    companyType: question.session.companyType ?? undefined,
    interviewType: question.session.interviewType ?? undefined,
    jobDescription: question.session.jobDescription ?? undefined,
    answer: parsed.data.answer,
  });

  const followUp = followUps.find((item) => item.trim().length > 0);
  if (!followUp) {
    return NextResponse.json(
      { error: "We couldn't generate a follow-up right now. Please try again in a moment." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    followUp,
    followUps,
    provider,
    model: model ?? null,
  });
}
