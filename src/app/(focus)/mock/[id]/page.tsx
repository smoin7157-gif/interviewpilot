import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedInterviewSession } from "@/lib/mock";
import { MockInterviewLazy as MockInterview } from "@/components/client-loaders";

/**
 * Put the role being rehearsed in the tab; the read is cached with the page's.
 * Next.js 16 allows either `metadata` or `generateMetadata`, not both, so the
 * fallback title is returned below.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const user = await requireUser();
  const { id } = await params;
  const session = await getOwnedInterviewSession(user.id, id);
  if (!session) return { title: "AI Mock Interview" };

  const atCompany = session.company ? ` at ${session.company}` : "";
  return {
    title: `Mock interview: ${session.role}${atCompany}`,
    description: `Rehearse ${session.role}${atCompany} aloud with an AI interviewer, then review a scored six-dimension debrief.`,
  };
}

export default async function MockInterviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;

  const session = await getOwnedInterviewSession(user.id, id);
  if (!session) redirect("/interviews");
  // The mock interviewer needs a prepared question bank; the workspace page
  // (with its generate panel) is the right place to make one.
  if (session.questions.length === 0) redirect(`/interviews/${session.id}`);

  // Only an owned question may be handed back to the workspace: the id arrives
  // from the URL, so it is resolved against this session's real questions
  // rather than trusted as-is.
  const returnQuestionId =
    typeof query.q === "string" && session.questions.some((question) => question.id === query.q)
      ? query.q
      : undefined;

  return (
    <MockInterview
      interviewId={session.id}
      role={session.role}
      company={session.company}
      seniority={session.seniority}
      interviewType={session.interviewType}
      companyType={session.companyType}
      questionCount={session.questions.length}
      targetCount={session.questionCountTarget}
      returnQuestionId={returnQuestionId}
    />
  );
}
