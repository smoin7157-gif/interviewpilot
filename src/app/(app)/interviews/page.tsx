import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Mic, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listSessionsForUser } from "@/lib/data";
import { formatRelativeTime, pluralize } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SessionMenu } from "@/components/session-menu";

export const metadata: Metadata = { title: "My Interviews" };

export default async function InterviewsPage() {
  const user = await requireUser();
  const sessions = await listSessionsForUser(user.id);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-[28px]">My Interviews</h1>
          <p className="mt-1.5 text-[15px] text-zinc-500">Practice for the roles that matter to you.</p>
        </div>
        <Link href="/interviews/new" className={buttonClasses({ size: "lg" })}>
          <Plus className="size-4" aria-hidden /> New Interview
        </Link>
      </div>

      {sessions.length === 0 ? (
        <Card className="mt-8 flex flex-col items-center px-6 py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <ClipboardList className="size-7" aria-hidden />
          </div>
          <h2 className="mt-5 text-lg font-semibold text-zinc-950">Your interview practice starts here.</h2>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-zinc-500">
            Create an interview for the role you&rsquo;re targeting and we&rsquo;ll generate realistic
            questions for you to practice.
          </p>
          <Link href="/interviews/new" className={buttonClasses({ size: "lg", className: "mt-7" })}>
            <Plus className="size-4" aria-hidden /> Create Interview
          </Link>
        </Card>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sessions.map((session) => {
            const progress = session.questionCount === 0 ? 0 : Math.round((session.practicedCount / session.questionCount) * 100);
            const actionLabel = session.questionCount === 0 ? "Generate" : session.practicedCount > 0 ? "Continue" : "Start";
            return (
              <Card key={session.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone="zinc">{session.seniority}</Badge>
                    {session.interviewType && <Badge tone="indigo">{session.interviewType}</Badge>}
                  </div>
                  <SessionMenu sessionId={session.id} />
                </div>

                <h2 className="mt-3 text-[17px] font-semibold leading-snug text-zinc-950">{session.role}</h2>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {session.company ?? "No company specified"}
                  {session.companyType ? ` · ${session.companyType}` : ""}
                </p>

                <div className="mt-4 space-y-1 text-[13px] text-zinc-500">
                  <p>
                    {session.questionCount === 0
                      ? "Questions not generated yet"
                      : `${session.questionCount} ${pluralize(session.questionCount, "question")}`}
                  </p>
                  <p>
                    {session.lastActivityAt
                      ? `Last practiced ${formatRelativeTime(session.lastActivityAt)}`
                      : "Not started"}
                  </p>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100" role="presentation">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                    {session.practicedCount}/{session.questionCount} practiced
                  </span>
                </div>

                <div className="mt-5 grid gap-2">
                  {session.questionCount > 0 && (
                    <Link
                      href={`/mock/${session.id}`}
                      className={buttonClasses({ variant: "outline", className: "w-full" })}
                    >
                      <Mic className="size-4 text-indigo-600" aria-hidden /> Practice aloud
                    </Link>
                  )}
                  <Link
                    href={`/interviews/${session.id}`}
                    className={buttonClasses({
                      variant: session.questionCount === 0 ? "outline" : "primary",
                      className: "w-full",
                    })}
                  >
                    {actionLabel}
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
