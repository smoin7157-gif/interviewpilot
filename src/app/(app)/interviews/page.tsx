import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Mic, Plus, Repeat2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listSessionsPage } from "@/lib/data";
import { parsePageParams } from "@/lib/pagination";
import { formatRelativeTime, pluralize } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/pagination";
import { SessionMenu } from "@/components/session-menu";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "My Interviews" };

export default async function InterviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; dir?: string }>;
}) {
  const user = await requireUser();
  const params = parsePageParams(await searchParams);
  const { items: sessions, olderCursor, newerCursor } = await listSessionsPage(user.id, params);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
      <PageHeader
        eyebrow="Your practice library"
        title="My Interviews"
        description="Practice for the roles that matter to you."
        actions={
          <Link href="/interviews/new" className={buttonClasses({ size: "lg" })}>
            <Plus className="size-4" aria-hidden /> New Interview
          </Link>
        }
      />

      {sessions.length === 0 ? (
        params.cursor ? (
          // A cursor that no longer resolves (the session was deleted between
          // requests) is not an empty account — send the user back to page one.
          <EmptyState
            className="mt-8"
            icon={ClipboardList}
            title="This page is empty."
            description="The interview list moved on — probably because a session was deleted."
            action={
              <Link href="/interviews" className={buttonClasses({ size: "lg" })}>
                Back to my interviews
              </Link>
            }
          />
        ) : (
          <EmptyState
            className="mt-8"
            icon={ClipboardList}
            title="Your interview practice starts here."
            description="Create an interview for the role you're targeting and we'll generate realistic questions for you to practice."
            action={
              <Link href="/interviews/new" className={buttonClasses({ size: "lg" })}>
                <Plus className="size-4" aria-hidden /> Create Interview
              </Link>
            }
          />
        )
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sessions.map((session) => {
            const progress = session.questionCount === 0 ? 0 : Math.round((session.practicedCount / session.questionCount) * 100);
            const actionLabel = session.questionCount === 0 ? "Generate" : session.practicedCount > 0 ? "Continue" : "Start";
            return (
              <Card
                key={session.id}
                className="flex flex-col p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_12px_32px_-16px_rgba(61,78,224,.3)]"
              >
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
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
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

                <Link
                  href={`/interviews/new?from=${session.id}`}
                  className="mt-3 inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-zinc-500 transition-colors hover:text-indigo-600"
                >
                  <Repeat2 className="size-3.5" aria-hidden /> Practice again with this setup
                </Link>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination
        basePath="/interviews"
        olderCursor={olderCursor}
        newerCursor={newerCursor}
        label="My interviews pages"
      />
    </div>
  );
}
