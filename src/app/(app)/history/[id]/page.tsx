import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Mic, Repeat2, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { countMainQuestions, getOwnedMockWithInterview } from "@/lib/mock";
import { formatRelativeTime, pluralize } from "@/lib/utils";
import type { DebriefData } from "@/lib/types";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DebriefView } from "@/components/debrief-view";
import { DebriefExport } from "@/components/debrief-export";
import { DebriefPanel } from "@/components/debrief-panel";
import { MockDeleteButton } from "@/components/mock-delete-button";

// The root layout's title template appends "· InterviewOS" — see history/page.tsx.
export const metadata: Metadata = { title: "Mock Debrief" };

export default async function MockDebriefPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const mock = await getOwnedMockWithInterview(user.id, id);
  if (!mock) redirect("/history");

  const debrief = (mock.debrief ?? null) as DebriefData | null;
  const hasDebrief = Boolean(debrief && mock.overallScore != null);
  const questionsAsked = countMainQuestions(mock.turns);
  const complete = mock.status === "SESSION_COMPLETE";
  const exportMeta = {
    role: mock.session.role,
    company: mock.session.company,
    seniority: mock.session.seniority,
    interviewType: mock.session.interviewType,
    createdAt: mock.createdAt,
  };
  const exportTurns = mock.turns.map((turn) => ({ speaker: turn.speaker, text: turn.transcript }));

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-8">
      <Link
        href="/history"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
      >
        <ArrowLeft className="size-4" aria-hidden /> Mock History
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-[28px]">
              {mock.session.role}
            </h1>
            {mock.session.company && <span className="text-base text-zinc-400">· {mock.session.company}</span>}
          </div>
          <p className="mt-1.5 text-[15px] text-zinc-500">
            {mock.session.seniority}
            {mock.session.interviewType ? ` · ${mock.session.interviewType}` : ""} ·{" "}
            {questionsAsked} {pluralize(questionsAsked, "main question")} asked ·{" "}
            {formatRelativeTime(mock.createdAt)}
            {mock.overallScore != null && ` · ${mock.overallScore}/100`}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {!complete && <Badge tone="amber">In progress</Badge>}
            {hasDebrief && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600">
                <Sparkles className="size-3.5" aria-hidden /> Debrief saved
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href={`/mock/${mock.session.id}`}
            className={buttonClasses({ variant: complete ? "outline" : "primary", size: "sm" })}
          >
            <Mic className="size-3.5" aria-hidden /> {complete ? "Practice again" : "Continue mock"}
          </Link>
          <Link
            href={`/interviews/new?from=${mock.session.id}`}
            className={buttonClasses({ variant: "outline", size: "sm" })}
          >
            <Repeat2 className="size-3.5" aria-hidden /> Practice again with this setup
          </Link>
          <MockDeleteButton mockId={mock.id} />
        </div>
      </div>

      <div className="mt-8">
        {hasDebrief && debrief ? (
          <>
            <DebriefView debrief={debrief} tone="light" />
            <DebriefExport
              debrief={debrief}
              meta={exportMeta}
              turns={exportTurns}
              tone="light"
              className="mt-4"
            />
          </>
        ) : (
          <>
            <DebriefPanel mockId={mock.id} />
            <DebriefExport meta={exportMeta} turns={exportTurns} tone="light" className="mt-4" />
          </>
        )}
      </div>

      {mock.turns.length > 0 && (
        <details className="mt-8 group">
          <summary className="cursor-pointer select-none text-sm font-medium text-zinc-700 hover:text-zinc-950">
            View transcript ({mock.turns.length} {pluralize(mock.turns.length, "turn")})
          </summary>
          <div className="mt-4 max-h-96 space-y-3 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 pr-2">
            {mock.turns.map((turn, i) => (
              <div
                key={i}
                className={
                  turn.speaker === "AI"
                    ? "rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm leading-relaxed text-zinc-700"
                    : "rounded-lg bg-indigo-50 px-3 py-2 text-sm leading-relaxed text-indigo-900"
                }
              >
                <span className="mr-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {turn.speaker === "AI" ? "Interviewer" : "You"}
                </span>
                {turn.transcript}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}