import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { WorkspaceQuestion, WorkspaceSession } from "@/lib/types";
import { InterviewWorkspace } from "@/components/interview-workspace";

export const metadata: Metadata = { title: "Interview Practice" };

export default async function InterviewWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const session = await prisma.interviewSession.findFirst({
    where: { id, userId: user.id },
    include: {
      questions: { orderBy: { orderIndex: "asc" as const } },
    },
  });
  if (!session) notFound();

  const lastAttempts = await prisma.questionAttempt.findMany({
    where: { userId: user.id, questionId: { in: session.questions.map((q) => q.id) } },
    orderBy: { createdAt: "desc" },
    select: { questionId: true, score: true },
  });
  const lastScoreByQuestion = new Map<string, number>();
  for (const attempt of lastAttempts) {
    if (!lastScoreByQuestion.has(attempt.questionId) && attempt.score != null) {
      lastScoreByQuestion.set(attempt.questionId, attempt.score);
    }
  }

  const sessionDto: WorkspaceSession = {
    id: session.id,
    role: session.role,
    seniority: session.seniority,
    company: session.company,
    companyType: session.companyType,
    interviewType: session.interviewType,
    jobDescription: session.jobDescription,
    status: session.status as WorkspaceSession["status"],
    questionCountTarget: session.questionCountTarget,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };

  const questions: WorkspaceQuestion[] = session.questions.map((q) => ({
    id: q.id,
    question: q.question,
    category: q.category,
    difficulty: q.difficulty,
    reason: q.reason,
    suggestedAnswer: q.suggestedAnswer,
    followUps: (q.followUps as string[]) ?? [],
    orderIndex: q.orderIndex,
    status: q.status as WorkspaceQuestion["status"],
    lastScore: lastScoreByQuestion.get(q.id) ?? null,
  }));

  return (
    <InterviewWorkspace
      key={`${session.id}:${session.updatedAt.getTime()}`}
      session={sessionDto}
      initialQuestions={questions}
    />
  );
}
