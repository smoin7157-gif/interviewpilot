import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mic, Plus, Sparkles, TrendingUp } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getRecentMocks, getRecentSessions, getScoreTrend } from "@/lib/data";
import { greeting, formatRelativeTime, pluralize } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreTrendChart } from "@/components/score-trend-chart";

export const metadata: Metadata = { title: "Dashboard" };

function ProgressBar({ practiced, total }: { practiced: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((practiced / total) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-zinc-100" role="presentation">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-zinc-500">
        {practiced}/{total} practiced
      </span>
    </div>
  );
}

function MockScoreChip({ score }: { score: number }) {
  const tone = score >= 80 ? "green" : score >= 60 ? "amber" : "red";
  return <Badge tone={tone}>{score}/100</Badge>;
}

export default async function DashboardPage() {
  const user = await requireUser();
  // The panels fetch independently — one round trip instead of three.
  const [recent, recentMocks, scoreTrend] = await Promise.all([
    getRecentSessions(user.id, 3),
    getRecentMocks(user.id, 3),
    getScoreTrend(user.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-600">{greeting()}, {user.name.split(" ")[0]}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-[28px]">
            Prepare for your next interview.
          </h1>
          <p className="mt-1.5 text-[15px] text-zinc-500">
            Create an interview for the role you&rsquo;re targeting and practice realistic questions.
          </p>
        </div>
        <Link href="/interviews/new" className={buttonClasses({ size: "lg" })}>
          <Plus className="size-4" aria-hidden /> New Interview
        </Link>
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Progress over time</h2>
            <p className="mt-0.5 text-[13px] text-zinc-500">
              Your overall mock interview scores, oldest to newest.
            </p>
          </div>
          {scoreTrend.length > 0 && (
            <Link
              href="/history"
              className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              View all <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          )}
        </div>

        {scoreTrend.length >= 2 ? (
          <Card className="mt-4 p-5 sm:p-6">
            <ScoreTrendChart
              points={scoreTrend.map((point) => ({
                id: point.id,
                score: point.score,
                label: formatRelativeTime(point.createdAt),
              }))}
            />
          </Card>
        ) : (
          <Card className="mt-4 flex flex-col items-center px-6 py-10 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <TrendingUp className="size-5" aria-hidden />
            </div>
            <h3 className="mt-3 text-base font-semibold text-zinc-900">
              {scoreTrend.length === 1
                ? "One scored mock so far."
                : "Your score trend starts after your first mock."}
            </h3>
            <p className="mt-1 max-w-sm text-sm leading-relaxed text-zinc-500">
              {scoreTrend.length === 1
                ? "Finish one more spoken mock interview and your progress will chart here."
                : "Complete a spoken mock interview and its overall score will chart here, so you can see whether you're improving."}
            </p>
            <Link href="/interviews" className={buttonClasses({ variant: "outline", size: "sm", className: "mt-5" })}>
              View my interviews
            </Link>
          </Card>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Recent Mock Interviews</h2>
          <Link
            href="/history"
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            View all <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>

        {recentMocks.length === 0 ? (
          <Card className="mt-4 flex flex-col items-center justify-center px-6 py-10 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <Mic className="size-5" aria-hidden />
            </div>
            <h3 className="mt-3 text-base font-semibold text-zinc-900">Practice aloud with the AI interviewer.</h3>
            <p className="mt-1 max-w-sm text-sm leading-relaxed text-zinc-500">
              From any interview, hit &ldquo;Practice aloud&rdquo; to rehearse spoken answers and get a
              scored debrief.
            </p>
          </Card>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {recentMocks.map((mock) => (
              <li key={mock.id}>
                <Link href={`/history/${mock.id}`} className="group block h-full">
                  <Card className="flex h-full flex-col gap-2.5 p-4 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-indigo-200 group-hover:shadow-[0_12px_32px_-16px_rgba(61,78,224,.3)]">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-3.5 shrink-0 text-indigo-500" aria-hidden />
                      <span className="truncate text-sm font-semibold text-zinc-950">{mock.role}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {mock.company && <span className="text-xs text-zinc-400">{mock.company}</span>}
                      <Badge tone="zinc">{mock.seniority}</Badge>
                      {mock.hasDebrief && mock.overallScore != null && (
                        <MockScoreChip score={mock.overallScore} />
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">
                      {mock.questionsAsked} {pluralize(mock.questionsAsked, "question")} ·{" "}
                      {formatRelativeTime(mock.createdAt)}
                    </p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Recent Interviews</h2>
          <Link
            href="/interviews"
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            View all <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>

        {recent.length === 0 ? (
          <Card className="mt-4 flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <Plus className="size-6" aria-hidden />
            </div>
            <h3 className="mt-4 text-base font-semibold text-zinc-900">Your interview practice starts here.</h3>
            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-zinc-500">
              Create an interview for the role you&rsquo;re targeting and we&rsquo;ll generate realistic
              questions for you.
            </p>
            <Link href="/interviews/new" className={buttonClasses({ className: "mt-6" })}>
              Create Interview
            </Link>
          </Card>
        ) : (
          <ul className="mt-4 space-y-3">
            {recent.map((session) => (
              <li key={session.id}>
                <Link href={`/interviews/${session.id}`} className="group block">
                  <Card className="flex flex-col gap-4 p-5 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-indigo-200 group-hover:shadow-[0_12px_32px_-16px_rgba(61,78,224,.3)] sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="text-[15px] font-semibold text-zinc-950">{session.role}</h3>
                        {session.company && <span className="text-sm text-zinc-400">· {session.company}</span>}
                        <Badge tone="zinc">{session.seniority}</Badge>
                        {session.interviewType && <Badge tone="indigo">{session.interviewType}</Badge>}
                        {session.status === "DRAFT" && <Badge tone="amber">Not generated</Badge>}
                      </div>
                      <p className="mt-1.5 text-[13px] text-zinc-500">
                        {session.questionCount === 0
                          ? "No questions yet"
                          : `${session.questionCount} ${pluralize(session.questionCount, "question")}`}
                        {session.lastActivityAt && ` · Last practiced ${formatRelativeTime(session.lastActivityAt)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-6 sm:justify-end">
                      {session.questionCount > 0 && (
                        <ProgressBar practiced={session.practicedCount} total={session.questionCount} />
                      )}
                      <span
                        className={buttonClasses({
                          variant: session.status === "READY" ? "primary" : "outline",
                          size: "sm",
                          className: "group-hover:shadow-none",
                        })}
                      >
                        {session.questionCount === 0 ? "Generate" : "Continue"}
                      </span>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
