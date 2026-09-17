import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateDebrief } from "@/lib/ai/service";
import { checkRateLimit, rateLimitError } from "@/lib/rate-limit";
import { getOwnedMockSession, TERMINAL_STATUSES } from "@/lib/mock";
import {
  buildDebriefContext,
  countCandidateAnswers,
  MIN_ANSWERS_FOR_DEBRIEF,
  type StoredDebrief,
} from "@/lib/debrief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const debriefBodySchema = z.object({
  /** Regenerate the debrief even when one is already stored. */
  force: z.boolean().optional().default(false),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`debrief:${user.id}`, { limit: 15, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) return rateLimitError(rl.retryAfterSeconds);

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = debriefBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { force } = parsed.data;

  // Both ownership reads are independent — the interview is reachable
  // through its mock relation, so this is one round trip instead of two.
  const [mock, interview] = await Promise.all([
    getOwnedMockSession(user.id, id),
    prisma.interviewSession.findFirst({
      where: {
        userId: user.id,
        mocks: { some: { id } },
      },
      include: { projects: true },
    }),
  ]);
  if (!mock) return NextResponse.json({ error: "Mock interview not found." }, { status: 404 });
  if (!interview) return NextResponse.json({ error: "Interview not found." }, { status: 404 });

  // Return the stored debrief when one exists and a refresh wasn't requested.
  if (!force && mock.debrief && mock.overallScore != null) {
    return NextResponse.json({
      mockSessionId: mock.id,
      overallScore: mock.overallScore,
      debrief: mock.debrief,
      generated: false,
    });
  }

  const answers = countCandidateAnswers(mock.turns);
  if (answers < MIN_ANSWERS_FOR_DEBRIEF) {
    return NextResponse.json(
      {
        error: `Answer at least ${MIN_ANSWERS_FOR_DEBRIEF} questions aloud before requesting a debrief (you answered ${answers}).`,
      },
      { status: 422 }
    );
  }

  const { result, provider, model } = await generateDebrief(
    buildDebriefContext({
      role: interview.role,
      seniority: interview.seniority,
      company: interview.company,
      companyType: interview.companyType,
      interviewType: interview.interviewType,
      jobDescription: interview.jobDescription,
      resumeContext: interview.resumeContext,
      githubContext: interview.githubContext,
      projects: interview.projects,
      maxQuestions: mock.maxQuestions,
      turns: mock.turns,
    })
  );

  const stored: StoredDebrief = { ...result, provider, model };
  await prisma.mockInterviewSession.update({
    where: { id: mock.id },
    data: {
      overallScore: result.overallScore,
      debrief: stored as unknown as Prisma.InputJsonValue,
      // Debriefs only make sense on a finished session; mark it complete so
      // it lands in history with its score.
      status: TERMINAL_STATUSES.includes(mock.status as (typeof TERMINAL_STATUSES)[number])
        ? mock.status
        : "SESSION_COMPLETE",
      endedAt: mock.endedAt ?? new Date(),
    },
  });

  return NextResponse.json({
    mockSessionId: mock.id,
    overallScore: result.overallScore,
    debrief: stored,
    generated: true,
  });
}