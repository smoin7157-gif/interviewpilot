"use client";

/**
 * Shared debrief renderer (InterviewOS Phase 4). One component, two tones:
 * `dark` for the mock-interview completion screen, `light` for the history
 * pages. The debrief is session-level practice feedback — the copy says so
 * explicitly and never claims employability.
 */

import { AlertTriangle, ArrowUpRight, Check, Lightbulb, Sparkles, Target, TrendingDown, TrendingUp } from "lucide-react";
import type { DebriefData } from "@/lib/types";
import { cn } from "@/lib/utils";

const DIMENSION_LABELS: Record<string, string> = {
  technical: "Technical",
  communication: "Communication",
  structure: "Structure",
  relevance: "Relevance",
  project_knowledge: "Project knowledge",
  problem_solving: "Problem solving",
};

function scoreTone(score: number): string {
  if (score >= 80) return "emerald";
  if (score >= 60) return "amber";
  return "red";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Strong session";
  if (score >= 60) return "Solid, with room to grow";
  if (score >= 40) return "Getting there";
  return "Needs practice";
}

function ScoreRing({ score, tone }: { score: number; tone: "dark" | "light" }) {
  const color = scoreTone(score);
  const ring =
    color === "emerald"
      ? tone === "dark"
        ? "text-emerald-400"
        : "text-emerald-600"
      : color === "amber"
        ? tone === "dark"
          ? "text-amber-400"
          : "text-amber-600"
        : tone === "dark"
          ? "text-red-400"
          : "text-red-600";
  const track = tone === "dark" ? "text-zinc-800" : "text-zinc-200";
  return (
    <div className="relative flex size-24 shrink-0 items-center justify-center sm:size-28" aria-hidden>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" strokeWidth="12" className={track} />
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 326.7} 326.7`}
          className={cn("transition-all duration-700", ring)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-bold tabular-nums", ring)}>{score}</span>
        <span className={cn("text-[10px] font-medium uppercase tracking-wide", tone === "dark" ? "text-zinc-500" : "text-zinc-400")}>
          / 100
        </span>
      </div>
    </div>
  );
}

function DimensionBar({ dimension, score, note, tone }: { dimension: string; score: number; note?: string; tone: "dark" | "light" }) {
  const color = scoreTone(score);
  const bar =
    color === "emerald"
      ? "bg-emerald-500"
      : color === "amber"
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <li>
      <div className="flex items-center justify-between gap-3">
        <span className={cn("text-sm font-medium", tone === "dark" ? "text-zinc-200" : "text-zinc-800")}>
          {DIMENSION_LABELS[dimension] ?? dimension}
        </span>
        <span className="text-sm font-semibold tabular-nums text-zinc-500">{score}</span>
      </div>
      <div className={cn("mt-1.5 h-1.5 overflow-hidden rounded-full", tone === "dark" ? "bg-zinc-800" : "bg-zinc-100")} role="presentation">
        <div className={cn("h-full rounded-full transition-all duration-700", bar)} style={{ width: `${score}%` }} />
      </div>
      {note && <p className={cn("mt-1 text-xs leading-relaxed", tone === "dark" ? "text-zinc-500" : "text-zinc-400")}>{note}</p>}
    </li>
  );
}

function ListBlock({
  title,
  items,
  icon,
  iconClass,
  tone,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  iconClass: string;
  tone: "dark" | "light";
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className={cn("flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide", tone === "dark" ? "text-zinc-300" : "text-zinc-900")}>
        <span className={iconClass}>{icon}</span>
        {title}
      </h4>
      <ul className={cn("mt-2 space-y-2", tone === "dark" ? "text-zinc-300" : "text-zinc-600")}>
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
            <span className={cn("mt-0.5 shrink-0", iconClass)} aria-hidden>
              {icon}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnswerHighlight({
  label,
  icon,
  iconClass,
  highlight,
  tone,
}: {
  label: string;
  icon: React.ReactNode;
  iconClass: string;
  highlight: { question: string; why: string };
  tone: "dark" | "light";
}) {
  if (!highlight.question && !highlight.why) return null;
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        tone === "dark" ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-white"
      )}
    >
      <p className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide", tone === "dark" ? "text-zinc-500" : "text-zinc-400")}>
        <span className={iconClass}>{icon}</span>
        {label}
      </p>
      <p className={cn("mt-2 text-sm font-medium leading-relaxed", tone === "dark" ? "text-zinc-100" : "text-zinc-900")}>
        {highlight.question}
      </p>
      <p className={cn("mt-1.5 text-[13px] leading-relaxed", tone === "dark" ? "text-zinc-400" : "text-zinc-500")}>{highlight.why}</p>
    </div>
  );
}

export function DebriefView({ debrief, tone = "light" }: { debrief: DebriefData; tone?: "dark" | "light" }) {
  const panel = tone === "dark" ? "border-zinc-800 bg-zinc-900/70" : "border-zinc-200 bg-white";
  const sub = tone === "dark" ? "text-zinc-400" : "text-zinc-500";
  const subHeading = tone === "dark" ? "text-zinc-300" : "text-zinc-900";

  return (
    <div className={cn("rounded-2xl border p-6 sm:p-7", panel)}>
      <div className="flex items-start gap-2">
        <Sparkles className={cn("mt-0.5 size-4 shrink-0", tone === "dark" ? "text-indigo-400" : "text-indigo-500")} aria-hidden />
        <p className={cn("text-xs font-semibold uppercase tracking-[0.16em]", tone === "dark" ? "text-indigo-300" : "text-indigo-600")}>
          Your debrief
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex items-center gap-4">
          <ScoreRing score={debrief.overallScore} tone={tone} />
          <div>
            <p className={cn("text-lg font-semibold tracking-tight", subHeading)}>{scoreLabel(debrief.overallScore)}</p>
            <p className={cn("mt-1 max-w-60 text-xs leading-relaxed", sub)}>
              Session-level practice score from your spoken answers — not an employability score.
            </p>
          </div>
        </div>
        <ul className="grid flex-1 gap-3 sm:grid-cols-2">
          {debrief.breakdown.map((dim) => (
            <DimensionBar key={dim.dimension} dimension={dim.dimension} score={dim.score} note={dim.note} tone={tone} />
          ))}
        </ul>
      </div>

      {(debrief.strengths.length > 0 || debrief.weaknesses.length > 0 || debrief.missedOpportunities.length > 0) && (
        <div className="mt-6 grid gap-5 border-t pt-6 sm:grid-cols-3" style={{ borderColor: tone === "dark" ? "rgb(39 43 69)" : undefined }}>
          <ListBlock
            title="What you did well"
            items={debrief.strengths}
            icon={<Check className="size-3.5" strokeWidth={3} aria-hidden />}
            iconClass={tone === "dark" ? "text-emerald-400" : "text-emerald-600"}
            tone={tone}
          />
          <ListBlock
            title="What to work on"
            items={debrief.weaknesses}
            icon={<AlertTriangle className="size-3.5" aria-hidden />}
            iconClass={tone === "dark" ? "text-amber-400" : "text-amber-600"}
            tone={tone}
          />
          <ListBlock
            title="Missed opportunities"
            items={debrief.missedOpportunities}
            icon={<Target className="size-3.5" aria-hidden />}
            iconClass={tone === "dark" ? "text-indigo-400" : "text-indigo-500"}
            tone={tone}
          />
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <AnswerHighlight
          label="Strongest answer"
          icon={<TrendingUp className="size-3.5" aria-hidden />}
          iconClass={tone === "dark" ? "text-emerald-400" : "text-emerald-600"}
          highlight={debrief.strongestAnswer}
          tone={tone}
        />
        <AnswerHighlight
          label="Weakest answer"
          icon={<TrendingDown className="size-3.5" aria-hidden />}
          iconClass={tone === "dark" ? "text-red-400" : "text-red-500"}
          highlight={debrief.weakestAnswer}
          tone={tone}
        />
      </div>

      {debrief.recommendedPractice.length > 0 && (
        <div className="mt-6 border-t pt-6" style={{ borderColor: tone === "dark" ? "rgb(39 43 69)" : undefined }}>
          <ListBlock
            title="Recommended practice"
            items={debrief.recommendedPractice}
            icon={<ArrowUpRight className="size-3.5" aria-hidden />}
            iconClass={tone === "dark" ? "text-indigo-400" : "text-indigo-500"}
            tone={tone}
          />
        </div>
      )}

      {debrief.provider === "fallback" && (
        <p className={cn("mt-5 flex items-center gap-1.5 text-[11px]", sub)}>
          <Lightbulb className="size-3.5" aria-hidden />
          Generated offline from answer heuristics (no AI key configured). Scores are honest estimates based on depth, structure, and outcomes.
        </p>
      )}
    </div>
  );
}