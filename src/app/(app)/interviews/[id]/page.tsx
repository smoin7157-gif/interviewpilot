import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedWorkspaceSession } from "@/lib/data";
import { resolvePracticePosition } from "@/lib/practice-position";
import type { WorkspaceQuestion, WorkspaceSession } from "@/lib/types";
import { InterviewWorkspace } from "@/components/interview-workspace";

export const metadata: Metadata = { title: "Interview Practice" };

export default async function InterviewWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string | string[]; f?: string | string[] }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;

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
    draftAnswer: q.draftAnswer,
  }));

  // The question (and follow-up) the URL points at, resolved against the
  // questions that actually exist — a stale link falls back to the resume rule.
  const initialPosition = resolvePracticePosition(questions, {
    q: typeof query.q === "string" ? query.q : undefined,
    f: typeof query.f === "string" ? query.f : undefined,
  });

  return (
    <InterviewWorkspace
      key={`${session.id}:${session.updatedAt.getTime()}`}
      session={sessionDto}
      initialQuestions={questions}
      initialPosition={initialPosition}
    />
  );
}
