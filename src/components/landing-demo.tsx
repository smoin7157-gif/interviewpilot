"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Lightbulb, MessageCircleQuestion, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Interactive landing preview: one real sample question per role, with the same
 * "why it matters → reveal the answer → follow-ups" structure the workspace
 * uses. It exists so a visitor can see the shape of a session before signing
 * up — the content is illustrative (clearly labelled), not a claim about a
 * specific company or generated live.
 */

interface SampleQuestion {
  id: string;
  role: string;
  category: string;
  difficulty: string;
  question: string;
  reason: string;
  answer: string;
  followUps: string[];
}

const SAMPLES: SampleQuestion[] = [
  {
    id: "backend",
    role: "Backend Engineer",
    category: "Technical",
    difficulty: "Hard",
    question:
      "We run about 40 million background jobs a day on one shared queue. How would you stop a single slow job type from starving everything else?",
    reason:
      "Tests whether you reason about isolation and backpressure in a system you can't simply scale out of — instead of reciting what a queue is.",
    answer:
      "First I'd measure: which job type is slow, and is it CPU, I/O, or an external dependency? Then I'd isolate rather than tune — give heavy job types their own queue and worker pool so a burst can't consume shared capacity. On top of that I'd add a per-type concurrency cap, a visibility timeout shorter than the longest healthy run, and a dead-letter path so poison retries can't cycle forever. The trade-off to call out is that more queues mean more operational surface, so I'd only split the types that actually contend.",
    followUps: [
      "What metrics would you watch first to confirm the diagnosis?",
      "How would you handle a poison message that fails every retry?",
      "What changes if the queue is shared across several tenants?",
    ],
  },
  {
    id: "pm",
    role: "Product Manager",
    category: "Behavioral",
    difficulty: "Medium",
    question:
      "Tell me about a time you shipped something that didn't move the metric you expected. What did you do next?",
    reason:
      "Looks for how you handle a null result: do you dig into the data and segment, or declare victory on the launch itself?",
    answer:
      "We shipped a guided setup flow to lift activation and saw no change in the aggregate number. Instead of calling it a win on completion rate, I segmented the funnel and found it helped brand-new users but stalled returning ones at a step they'd already solved. I ran a follow-up that skipped that step for returning users, which moved the metric. The lesson I carried forward was to define the segment each change is meant to affect before we ship, not after the number comes in flat.",
    followUps: [
      "How did you decide the original bet was still worth shipping?",
      "What would you have done differently with the experiment design?",
      "How did you communicate the miss to stakeholders?",
    ],
  },
  {
    id: "ds",
    role: "Data Scientist",
    category: "Data / ML",
    difficulty: "Medium",
    question:
      "Offline AUC went up, but the online metric didn't budge. How do you work out what went wrong?",
    reason:
      "Checks for train/serve reasoning — leakage, distribution shift, and whether offline eval even reflects the business decision — rather than model tweaking.",
    answer:
      "I'd start by confirming the offline win is real: a temporal split rather than a random one, no features that leak the label, and the same preprocessing at train and serve time. Then I'd check that AUC is the right proxy — if the product only acts on the top 1%, ranking metrics and calibration matter more than the full-curve number. After that I'd look at where the model actually changes a decision: if it agrees with the existing heuristic on nearly all of them, there's nothing to move. Finally I'd slice online results by cohort before concluding the model is fine and the idea was wrong.",
    followUps: [
      "How would you detect feature drift after the launch?",
      "What offline metric would you have chosen instead of AUC?",
      "How would you size the experiment before calling it flat?",
    ],
  },
];

export function LandingDemo({ primaryHref = "/signup" }: { primaryHref?: string }) {
  const [activeId, setActiveId] = useState(SAMPLES[0].id);
  const [revealed, setRevealed] = useState(false);

  const sample = SAMPLES.find((s) => s.id === activeId) ?? SAMPLES[0];

  function selectRole(id: string) {
    setActiveId(id);
    setRevealed(false);
  }

  return (
    <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
      {/* Role picker */}
      <div>
        <p className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
          Pick a role
        </p>
        <div
          role="tablist"
          aria-label="Sample roles"
          aria-orientation="vertical"
          className="mt-3 flex flex-row gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {SAMPLES.map((s) => {
            const active = s.id === activeId;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectRole(s.id)}
                className={cn(
                  "shrink-0 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                  active
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                )}
              >
                {s.role}
              </button>
            );
          })}
        </div>

        <div className="mt-6 hidden rounded-2xl border border-zinc-200 bg-white p-5 lg:block">
          <div className="flex items-center gap-2 text-indigo-600">
            <Sparkles className="size-4" aria-hidden />
            <p className="text-sm font-semibold text-zinc-900">Illustrative sample</p>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
            Questions are generated per role, level, and the job description you paste — so what you
            practice looks like what you&rsquo;ll actually be asked.
          </p>
          <Link
            href={primaryHref}
            className={buttonClasses({ size: "sm", variant: "outline", className: "mt-4 w-full" })}
          >
            Try your own role <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>

      {/* Question card */}
      <div
        role="tabpanel"
        aria-label={`${sample.role} sample question`}
        className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_1px_2px_rgba(16,21,40,.05),0_12px_32px_-20px_rgba(16,21,40,.2)] sm:p-8"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="indigo">{sample.category}</Badge>
          <Badge tone="neutral">{sample.difficulty}</Badge>
          <span className="text-xs font-medium text-zinc-400">Question 01</span>
        </div>

        <h3 className="mt-5 text-xl font-semibold leading-snug tracking-tight text-zinc-950 sm:text-[22px]">
          {sample.question}
        </h3>

        <div className="mt-6 flex items-start gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
          <div>
            <p className="text-[13px] font-semibold text-zinc-900">Why this question matters</p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600">{sample.reason}</p>
          </div>
        </div>

        <div className="mt-6">
          {revealed ? (
            <div>
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-[13px] font-semibold uppercase tracking-wide text-zinc-900">
                  Suggested answer
                </h4>
                <Button size="sm" variant="ghost" onClick={() => setRevealed(false)}>
                  <EyeOff className="size-4" aria-hidden /> Hide
                </Button>
              </div>
              <p className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 text-[15px] leading-relaxed text-zinc-700">
                {sample.answer}
              </p>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setRevealed(true)}>
              <Eye className="size-4" aria-hidden /> Reveal suggested answer
            </Button>
          )}
        </div>

        <div className="mt-7 border-t border-zinc-100 pt-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-zinc-900">
            <MessageCircleQuestion className="size-4 text-indigo-500" aria-hidden />
            Then it probes deeper
          </p>
          <ul className="mt-3 space-y-2">
            {sample.followUps.map((followUp) => (
              <li
                key={followUp}
                className="flex items-start gap-2.5 rounded-lg bg-zinc-50 px-3.5 py-2.5 text-sm leading-relaxed text-zinc-600"
              >
                <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-zinc-400" aria-hidden />
                {followUp}
              </li>
            ))}
          </ul>
        </div>

        <Link
          href={primaryHref}
          className={buttonClasses({ className: "mt-7 w-full sm:w-auto", size: "lg" })}
        >
          Practice this for your role <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
