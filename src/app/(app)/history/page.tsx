import type { Metadata } from "next";
import Link from "next/link";
import { Mic, MicVocal, Plus, Repeat2, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listOwnedMocksPage } from "@/lib/mock";
import { parsePageParams } from "@/lib/pagination";
import { formatRelativeTime, pluralize } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/pagination";
import { MockDeleteButton } from "@/components/mock-delete-button";

// The root layout's title template appends "· InterviewOS", so only the page
// name belongs here — including it again produced a doubled suffix.
export const metadata: Metadata = { title: "Mock History" };

function statusInfo(status: string): { label: string; tone: "green" | "amber" | "zinc" | "red" } {
  switch (status) {
    case "SESSION_COMPLETE":
      return { label: "Complete", tone: "green" };
    case "SESSION_STARTED":
    case "QUESTION_COMPLETE":
      return { label: "In progress", tone: "amber" };
    case "ERROR":
      return { label: "Error", tone: "red" };
    default:
      return { label: status, tone: "zinc" };
  }
}

function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 80 ? "green" : score >= 60 ? "amber" : "red";
  return <Badge tone={tone}>{score}/100</Badge>;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; dir?: string }>;
}) {
  const user = await requireUser();
  const params = parsePageParams(await searchParams);
  const { items: mocks, olderCursor, newerCursor } = await listOwnedMocksPage(user.id, params);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-[28px]">Mock History</h1>
          <p className="mt-1.5 text-[15px] text-zinc-500">
            Every AI mock interview you&rsquo;ve practiced aloud, with debriefs and scores.
          </p>
        </div>
        <Link href="/interviews" className={buttonClasses({ size: "lg" })}>
          <Plus className="size-4" aria-hidden /> Create Interview
        </Link>
      </div>

      {mocks.length === 0 ? (
        params.cursor ? (
          // The cursor's session was deleted between requests — offer a way
          // back to the newest page rather than a dead end.
          <Card className="mt-8 flex flex-col items-center px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-zinc-950">This page is empty.</h2>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-zinc-500">
              Your mock history moved on — probably because a session was deleted.
            </p>
            <Link href="/history" className={buttonClasses({ size: "lg", className: "mt-7" })}>
              Back to mock history
            </Link>
          </Card>
        ) : (
          <Card className="mt-8 flex flex-col items-center px-6 py-20 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <MicVocal className="size-7" aria-hidden />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-zinc-950">No mock interviews yet.</h2>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-zinc-500">
              Open any generated interview and hit &ldquo;Practice aloud&rdquo; to rehearse with the AI
              interviewer. Completed sessions land here with a full debrief.
            </p>
            <Link href="/interviews" className={buttonClasses({ size: "lg", className: "mt-7" })}>
              <Mic className="size-4" aria-hidden /> Go to My Interviews
            </Link>
          </Card>
        )
      ) : (
        <ul className="mt-8 space-y-3">
          {mocks.map((mock) => {
            const status = statusInfo(mock.status);
            return (
              <li key={mock.id}>
                <Card className="flex flex-col gap-4 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_12px_32px_-16px_rgba(61,78,224,.3)] sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="text-[15px] font-semibold text-zinc-950">{mock.role}</h3>
                      {mock.company && <span className="text-sm text-zinc-400">· {mock.company}</span>}
                      <Badge tone="zinc">{mock.seniority}</Badge>
                      {mock.interviewType && <Badge tone="indigo">{mock.interviewType}</Badge>}
                      <Badge tone={status.tone}>{status.label}</Badge>
                      {mock.hasDebrief && mock.overallScore != null && <ScoreBadge score={mock.overallScore} />}
                    </div>
                    <p className="mt-1.5 text-[13px] text-zinc-500">
                      {mock.questionsAsked} {pluralize(mock.questionsAsked, "main question")} asked ·{" "}
                      {formatRelativeTime(mock.createdAt)}
                    </p>
                    <Link
                      href={`/interviews/new?from=${mock.interviewSessionId}`}
                      className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-500 transition-colors hover:text-indigo-600"
                    >
                      <Repeat2 className="size-3.5" aria-hidden /> Practice again with this setup
                    </Link>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Link
                      href={`/mock/${mock.interviewSessionId}`}
                      className={buttonClasses({
                        variant: mock.status === "SESSION_COMPLETE" ? "outline" : "primary",
                        size: "sm",
                      })}
                    >
                      {mock.status === "SESSION_COMPLETE" ? "Practice again" : "Continue"}
                    </Link>
                    <Link
                      href={`/history/${mock.id}`}
                      className={buttonClasses({ variant: "outline", size: "sm" })}
                    >
                      {mock.hasDebrief ? (
                        <>
                          <Sparkles className="size-3.5 text-indigo-600" aria-hidden /> View debrief
                        </>
                      ) : (
                        "Details"
                      )}
                    </Link>
                    <MockDeleteButton mockId={mock.id} />
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        basePath="/history"
        olderCursor={olderCursor}
        newerCursor={newerCursor}
        label="Mock history pages"
      />
    </div>
  );
}