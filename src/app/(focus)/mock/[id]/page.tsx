import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnedInterviewSession } from "@/lib/mock";
import { MockInterview } from "@/components/mock-interview";

// The root layout's title template appends "· InterviewOS" — see history/page.tsx.
export const metadata: Metadata = { title: "AI Mock Interview" };

export default async function MockInterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const session = await getOwnedInterviewSession(user.id, id);
  if (!session) redirect("/interviews");
  // The mock interviewer needs a prepared question bank; the workspace page
  // (with its generate panel) is the right place to make one.
  if (session.questions.length === 0) redirect(`/interviews/${session.id}`);

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
    />
  );
}
