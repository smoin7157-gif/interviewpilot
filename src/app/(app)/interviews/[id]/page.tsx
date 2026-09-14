import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedWorkspaceSession } from "@/lib/data";
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

  const owned = await getOwnedWorkspaceSession(user.id, id);
  if (!owned) notFound();
  const { session, lastScoreByQuestion } = owned;

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
    sourceContext: Array.isArray(q.sourceContext) ? (q.sourceContext as string[]) : [],
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
