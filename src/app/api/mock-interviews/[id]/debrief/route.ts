import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateDebrief } from "@/lib/ai/service";
import { getOwnedInterviewSession, getOwnedMockSession, TERMINAL_STATUSES } from "@/lib/mock";
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

  const mock = await getOwnedMockSession(user.id, id);
  if (!mock) return NextResponse.json({ error: "Mock interview not found." }, { status: 404 });

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

  const interview = await getOwnedInterviewSession(user.id, mock.interviewSessionId);
  if (!interview) return NextResponse.json({ error: "Interview not found." }, { status: 404 });

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