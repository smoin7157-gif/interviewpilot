import Link from "next/link";
import { ArrowRight, Flame, Mic, Sparkles, Target, TrendingUp } from "lucide-react";
import type { PracticeOverview } from "@/lib/data";
import { nextBestStep } from "@/lib/stats";
import { pluralize } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Dashboard "momentum" panel: what to do next plus the numbers behind it.
 *
 * Everything here is derived from real activity — no invented scores or
 * encouraging filler. When there is nothing yet, the tiles say so with a dash
 * rather than a zero dressed up as progress.
 */

const TONE_STYLES = {
  start: {
    ring: "border-indigo-100",
    glow: "from-indigo-50 via-white to-violet-50",
    icon: Sparkles,
  },
  continue: {
    ring: "border-indigo-100",
    glow: "from-indigo-50 via-white to-violet-50",
    icon: Target,
  },
  review: {
    ring: "border-amber-100",
    glow: "from-amber-50 via-white to-amber-50/40",
    icon: TrendingUp,
  },
} as const;

export function NextStepCard({ overview }: { overview: PracticeOverview }) {
  const step = nextBestStep({
    interviews: overview.interviews,
    questionsGenerated: overview.questionsGenerated,
    questionsPracticed: overview.questionsPracticed,
    mocksCompleted: overview.mocksCompleted,
    latestMock: overview.latestMock,
  });
  const tone = TONE_STYLES[step.tone];

  return (
    <div
      className={cn(
        "flex flex-col gap-5 rounded-3xl border bg-gradient-to-br p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7",
        tone.ring,
        tone.glow
      )}
    >
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-400 text-white shadow-[0_8px_16px_-8px_rgba(61,78,224,.6)]">
          <tone.icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
            {step.eyebrow}
          </p>
          <h2 className="mt-1.5 text-lg font-bold tracking-[-0.02em] text-zinc-950">{step.title}</h2>
          <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-zinc-600">{step.body}</p>
        </div>
      </div>
      <Link href={step.href} className={buttonClasses({ size: "lg", className: "shrink-0" })}>
        {step.cta} <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  detail,
  accent = false,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-4",
        accent ? "border-amber-200/70" : "border-zinc-200"
      )}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={cn("size-4", accent ? "text-amber-500" : "text-indigo-500")}
          aria-hidden
        />
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-zinc-950">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-zinc-500">{detail}</p>
    </div>
  );
}

export function PracticeStatsStrip({ overview }: { overview: PracticeOverview }) {
  const { streakDays, questionsPracticed, questionsGenerated, mocksCompleted, bestScore } = overview;
  const remaining = Math.max(0, questionsGenerated - questionsPracticed);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        icon={Flame}
        label="Streak"
        value={streakDays === 0 ? "—" : `${streakDays} ${pluralize(streakDays, "day")}`}
        detail={streakDays > 1 ? "Consecutive days of practice" : "Practice today to start a streak"}
        accent={streakDays > 0}
      />
      <StatTile
        icon={Target}
        label="Questions"
        value={questionsGenerated === 0 ? "—" : `${questionsPracticed}/${questionsGenerated}`}
        detail={
          questionsGenerated === 0
            ? "Generate an interview to begin"
            : remaining === 0
              ? "Every question practiced"
              : `${remaining} ${pluralize(remaining, "question")} still to go`
        }
      />
      <StatTile
        icon={Mic}
        label="Mocks"
        value={mocksCompleted === 0 ? "—" : String(mocksCompleted)}
        detail={mocksCompleted === 0 ? "No spoken sessions yet" : "Completed spoken sessions"}
      />
      <StatTile
        icon={TrendingUp}
        label="Best score"
        value={bestScore == null ? "—" : `${bestScore}`}
        detail={
          overview.averageScore == null
            ? "From your mock debriefs"
            : `${overview.averageScore} average across debriefs`
        }
      />
    </div>
  );
}
