"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  CircleSlash2,
  Eye,
  EyeOff,
  Lightbulb,
  List,
  MessageCircleQuestion,
  PenLine,
  Sparkles,
  X,
} from "lucide-react";
import type { EvaluationFeedback, WorkspaceQuestion, WorkspaceSession } from "@/lib/types";
import { cn, pluralize } from "@/lib/utils";
import { Badge, categoryTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { GeneratePanel, type GenerationContextPayload } from "@/components/generate-interview";

const PRACTICE_MIN_LENGTH = 10;

type Tab = "interview" | "followup";
function scoreColor(score: number): { text: string; ring: string; label: string } {
  if (score >= 80) return { text: "text-emerald-600", ring: "border-emerald-200 bg-emerald-50", label: "Strong answer" };
  if (score >= 60) return { text: "text-amber-600", ring: "border-amber-200 bg-amber-50", label: "Solid, with gaps" };
  return { text: "text-red-600", ring: "border-red-200 bg-red-50", label: "Needs work" };
}

function StatusPill({ status }: { status: WorkspaceQuestion["status"] }) {
  if (status === "PRACTICED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
        <CheckCircle2 className="size-3.5" aria-hidden /> Practiced
      </span>
    );
  }
  if (status === "SKIPPED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400">
        <CircleSlash2 className="size-3.5" aria-hidden /> Skipped
      </span>
    );
  }
  return <span className="text-xs font-medium text-zinc-300">Not started</span>;
}

/* ---------------------------------- Question row ---------------------------------- */

function QuestionRow({
  index,
  question,
  active,
  isFollowUp,
  onSelect,
}: {
  index: number;
  question: WorkspaceQuestion;
  active: boolean;
  isFollowUp: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={cn(
        "group w-full border-l-2 px-4 py-3.5 text-left transition-colors",
        "focus-visible:outline-none focus-visible:bg-zinc-50",
        active
          ? "border-indigo-500 bg-indigo-50/40"
          : "border-transparent hover:bg-zinc-50/70"
      )}
    >
      <div className="flex items-center gap-2">
        {isFollowUp ? (
          <MessageCircleQuestion className="size-3.5 shrink-0 text-indigo-400" aria-hidden />
        ) : (
          <span
            className={cn(
              "text-[11px] font-semibold tabular-nums",
              active ? "text-indigo-600" : "text-zinc-400 group-hover:text-zinc-500"
            )}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
        <span
          className={cn(
            "truncate text-[11px] font-medium",
            active ? "text-indigo-700" : "text-zinc-400"
          )}
        >
          {isFollowUp ? "Follow-up" : question.category}
        </span>
        {question.status === "PRACTICED" && !isFollowUp && (
          <CheckCircle2 className="ml-auto size-4 shrink-0 text-emerald-500" aria-hidden />
        )}
        {question.status === "SKIPPED" && !isFollowUp && (
          <CircleSlash2 className="ml-auto size-4 shrink-0 text-zinc-300" aria-hidden />
        )}
      </div>
      <p
        className={cn(
          "mt-1 line-clamp-2 text-sm leading-snug",
          active ? "font-medium text-zinc-950" : "text-zinc-600"
        )}
      >
        {question.question}
      </p>
    </button>
  );
}

/* ---------------------------------- Question list column ---------------------------------- */

function QuestionList({
  tab,
  onTabChange,
  questions,
  mainIdx,
  fupIdx,
  onSelectMain,
  onSelectFollowUp,
  practicedCount,
}: {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  questions: WorkspaceQuestion[];
  mainIdx: number;
  fupIdx: number;
  onSelectMain: (idx: number) => void;
  onSelectFollowUp: (idx: number) => void;
  practicedCount: number;
}) {
  const main = questions[mainIdx];
  const followUps = main?.followUps ?? [];

  const interviewCount = questions.length;
  const followUpCount = followUps.length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-zinc-200 px-3 pt-3">
        <button
          type="button"
          onClick={() => onTabChange("interview")}
          aria-pressed={tab === "interview"}
          className={cn(
            "flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
            tab === "interview"
              ? "border-b-2 border-indigo-600 text-zinc-950"
              : "text-zinc-500 hover:text-zinc-800"
          )}
        >
          Interview
          <span
            className={cn(
              "rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
              tab === "interview" ? "bg-indigo-100 text-indigo-700" : "bg-zinc-100 text-zinc-500"
            )}
          >
            {interviewCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange("followup")}
          aria-pressed={tab === "followup"}
          disabled={followUpCount === 0}
          className={cn(
            "flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
            "disabled:cursor-not-allowed disabled:opacity-50",
            tab === "followup"
              ? "border-b-2 border-indigo-600 text-zinc-950"
              : "text-zinc-500 hover:text-zinc-800"
          )}
        >
          Follow Up
          <span
            className={cn(
              "rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
              tab === "followup" ? "bg-indigo-100 text-indigo-700" : "bg-zinc-100 text-zinc-500"
            )}
          >
            {followUpCount}
          </span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        {tab === "interview" ? (
          questions.map((question, idx) => (
            <QuestionRow
              key={question.id}
              index={idx}
              question={question}
              active={idx === mainIdx}
              isFollowUp={false}
              onSelect={() => onSelectMain(idx)}
            />
          ))
        ) : followUps.length > 0 ? (
          <>
            <div className="border-b border-zinc-100 px-4 py-2.5">
              <p className="text-xs leading-snug text-zinc-500">
                Follow-ups for question {mainIdx + 1}
              </p>
            </div>
            {followUps.map((fup, idx) => {
              const fake: WorkspaceQuestion = {
                id: `${main?.id}-fup-${idx}`,
                question: fup,
                category: "Follow-up",
                difficulty: "",
                reason: "",
                suggestedAnswer: "",
                followUps: [],
                orderIndex: idx,
                status: "NOT_STARTED",
                lastScore: null,
              };
              return (
                <QuestionRow
                  key={idx}
                  index={idx}
                  question={fake}
                  active={idx === fupIdx}
                  isFollowUp
                  onSelect={() => onSelectFollowUp(idx)}
                />
              );
            })}
          </>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-zinc-400">
            No follow-ups for this question yet.
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-zinc-200 px-4 py-3">
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-medium text-zinc-700">Progress</span>
          <span className="tabular-nums text-zinc-500">
            {practicedCount} / {questions.length} practiced
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{ width: `${questions.length === 0 ? 0 : (practicedCount / questions.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Suggested answer ---------------------------------- */

function SuggestedAnswer({ answer }: { answer: string }) {
  const [visible, setVisible] = useState(false);

  if (!visible) {
    return (
      <Button variant="outline" onClick={() => setVisible(true)}>
        <Eye className="size-4" aria-hidden /> See Answer
      </Button>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-zinc-900">Suggested answer</h3>
        <Button size="sm" variant="ghost" onClick={() => setVisible(false)}>
          <EyeOff className="size-4" aria-hidden /> Hide Answer
        </Button>
      </div>
      <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 text-[15px] leading-relaxed text-zinc-800">
        <p className="whitespace-pre-wrap">{answer}</p>
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        A strong response to aim for — don&rsquo;t memorize it word-for-word.
      </p>
    </div>
  );
}

/* ---------------------------------- Practice + evaluation ---------------------------------- */

function PracticeSection({
  prompt,
  questionId,
  onEvaluated,
  className,
}: {
  prompt: string;
  questionId: string;
  onEvaluated: (feedback: EvaluationFeedback) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<EvaluationFeedback | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function handleEvaluate() {
    if (text.trim().length < PRACTICE_MIN_LENGTH) {
      setError("Write at least a few sentences before evaluating.");
      return;
    }
    setEvaluating(true);
    setError(null);
    try {
      const res = await fetch(`/api/questions/${questionId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: text.trim(), prompt }),
      });
      const data = (await res.json()) as EvaluationFeedback & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Evaluation failed.");
      const fb: EvaluationFeedback = {
        score: data.score,
        strengths: data.strengths ?? [],
        missing: data.missing ?? [],
        improvements: data.improvements ?? [],
      };
      setFeedback(fb);
      onEvaluated(fb);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't evaluate your answer. Please try again.");
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-zinc-900">Your answer</h3>
        {!open && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <PenLine className="size-4" aria-hidden /> Practice Answer
          </Button>
        )}
      </div>

      {!open ? (
        <p className="mt-2 text-[15px] leading-relaxed text-zinc-500">
          Think through your response before revealing the suggested answer. When you&rsquo;re ready, practice
          it out loud or type it here for feedback.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <Textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your answer here…"
            aria-label="Your practice answer"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-400">Be specific — the feedback is based on your actual answer.</p>
            <Button onClick={handleEvaluate} loading={evaluating} disabled={text.trim().length < PRACTICE_MIN_LENGTH}>
              {evaluating ? "Evaluating…" : "Evaluate My Answer"}
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
      )}

      {feedback && (
        <div ref={resultRef} className="mt-5">
          <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:flex-row sm:items-start">
            <div
              className={cn(
                "flex size-16 shrink-0 flex-col items-center justify-center rounded-full border-2",
                scoreColor(feedback.score).ring
              )}
            >
              <span className={cn("text-xl font-bold tabular-nums", scoreColor(feedback.score).text)}>
                {feedback.score}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">/ 100</span>
            </div>
            <div className="min-w-0 flex-1 space-y-4">
              <FeedbackList
                title="What you did well"
                items={feedback.strengths}
                icon={<Check className="size-3.5 text-emerald-500" strokeWidth={3} aria-hidden />}
              />
              <FeedbackList
                title="What was missing"
                items={feedback.missing}
                icon={<X className="size-3.5 text-amber-500" aria-hidden />}
              />
              <FeedbackList
                title="How to improve"
                items={feedback.improvements}
                icon={<ArrowRight className="size-3.5 text-indigo-500" aria-hidden />}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackList({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="text-[13px] font-semibold text-zinc-900">{title}</h4>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-zinc-600">
            <span className="mt-0.5 shrink-0">{icon}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------- Main component ---------------------------------- */

export function InterviewWorkspace({
  session,
  initialQuestions,
}: {
  session: WorkspaceSession;
  initialQuestions: WorkspaceQuestion[];
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState<WorkspaceQuestion[]>(initialQuestions);
  const [mainIdx, setMainIdx] = useState(() =>
    initialQuestions.length > 0 ? 0 : -1
  );
  const [tab, setTab] = useState<Tab>("interview");
  const [fupIdx, setFupIdx] = useState(0);
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const main = mainIdx >= 0 ? questions[mainIdx] : undefined;
  const followUps = main?.followUps ?? [];
  const practicedCount = useMemo(() => questions.filter((q) => q.status === "PRACTICED").length, [questions]);

  const generationContext: GenerationContextPayload = {
    role: session.role,
    seniority: session.seniority,
    company: session.company,
    companyType: session.companyType,
    interviewType: session.interviewType,
    jobDescription: session.jobDescription,
    count: session.questionCountTarget,
  };

  const selectMain = useCallback(
    (idx: number) => {
      setMainIdx(idx);
      setFupIdx(0);
      setTab("interview");
      setMobileListOpen(false);
    },
    []
  );

  const selectFollowUp = useCallback((idx: number) => {
    setFupIdx(idx);
    setTab("followup");
    setMobileListOpen(false);
  }, []);

  // Keyboard navigation: arrow left / right.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable)) return;
      if (questions.length === 0) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (tab === "interview") {
          setMainIdx((i) => Math.min(i + 1, questions.length - 1));
        } else {
          setFupIdx((i) => Math.min(i + 1, followUps.length - 1));
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (tab === "interview") {
          setMainIdx((i) => Math.max(i - 1, 0));
        } else {
          setFupIdx((i) => Math.max(i - 1, 0));
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [questions.length, tab, followUps.length]);

  function handlePracticeStatus(status: WorkspaceQuestion["status"]) {
    if (!main) return;
    fetch(`/api/questions/${main.id}/practice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
      .then((res) => (res.ok ? null : Promise.reject(new Error("failed"))))
      .then(() => {
        setQuestions((prev) => prev.map((q) => (q.id === main.id ? { ...q, status } : q)));
      })
      .catch(() => {
        // Non-critical — keep UI as-is and ignore.
      });
  }

  function handleEvaluated(questionId: string) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, status: "PRACTICED" as const } : q))
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-lg">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
              {session.role}
              {session.company ? ` at ${session.company}` : ""}
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              This interview hasn&rsquo;t been generated yet. Create it now — it takes about 30 seconds.
            </p>
          </div>
          <GeneratePanel
            sessionId={session.id}
            context={generationContext}
            title="Building your interview…"
            onDone={() => router.refresh()}
          />
          <div className="mt-4 text-center">
            <Link
              href="/interviews"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-800"
            >
              <ArrowLeft className="size-4" aria-hidden /> Back to My Interviews
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!main) return null;

  // Active practice identity.
  const viewingFollowUp = tab === "followup" && followUps.length > 0;
  const activeFollowUp = viewingFollowUp ? followUps[fupIdx] ?? followUps[0] : null;
  const activeQuestion = main;
  const practicePrompt = viewingFollowUp
    ? (followUps[fupIdx] ?? followUps[0])
    : activeQuestion.question;
  const practiceQuestionId = activeQuestion.id;
  const practiceKey = `${activeQuestion.id}::${viewingFollowUp ? `f::${fupIdx}` : "m"}`;

  const totalInTab = viewingFollowUp ? followUps.length : questions.length;
  const positionInTab = viewingFollowUp ? (fupIdx >= followUps.length ? 1 : fupIdx + 1) : mainIdx + 1;

  const goNext = () =>
    viewingFollowUp
      ? setFupIdx((i) => Math.min(i + 1, followUps.length - 1))
      : setMainIdx((i) => Math.min(i + 1, questions.length - 1));
  const goPrev = () =>
    viewingFollowUp
      ? setFupIdx((i) => Math.max(i - 1, 0))
      : setMainIdx((i) => Math.max(i - 1, 0));

  const listContent = (
    <QuestionList
      tab={tab}
      onTabChange={(t) => {
        setTab(t);
        if (t === "followup") setMobileListOpen(false);
      }}
      questions={questions}
      mainIdx={mainIdx}
      fupIdx={fupIdx}
      onSelectMain={selectMain}
      onSelectFollowUp={selectFollowUp}
      practicedCount={practicedCount}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* Session header strip */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-4 sm:px-6">
        <button
          type="button"
          className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 md:hidden"
          aria-label="Open question list"
          onClick={() => setMobileListOpen(true)}
        >
          <List className="size-5" aria-hidden />
        </button>
        <Link
          href="/interviews"
          className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 md:inline-flex"
        >
          <ArrowLeft className="size-4" aria-hidden /> Interviews
        </Link>
        <div className="hidden h-5 w-px bg-zinc-200 sm:block" aria-hidden />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold text-zinc-950">
            {session.role}
            {session.company ? ` · ${session.company}` : ""}
          </h1>
          <p className="truncate text-xs text-zinc-400">
            {session.seniority}
            {session.interviewType ? ` · ${session.interviewType}` : ""} · {questions.length}{" "}
            {pluralize(questions.length, "question")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-zinc-100 sm:block" role="presentation">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${(practicedCount / questions.length) * 100}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-medium tabular-nums text-zinc-500">
            {practicedCount}/{questions.length} practiced
          </span>
        </div>
      </div>

      {/* Mobile slide-over list */}
      {mobileListOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close question list"
            className="absolute inset-0 bg-zinc-950/30"
            onClick={() => setMobileListOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 z-10 flex w-[85%] max-w-sm flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <span className="text-sm font-semibold text-zinc-900">Questions</span>
              <button
                type="button"
                onClick={() => setMobileListOpen(false)}
                aria-label="Close"
                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1">{listContent}</div>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Desktop list */}
        <aside className="hidden w-80 shrink-0 border-r border-zinc-200 bg-white md:block xl:w-96">
          {listContent}
        </aside>

        {/* Detail */}
        <section
          aria-label="Question detail"
          className="flex min-w-0 flex-1 flex-col bg-zinc-50/50"
        >
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-8 sm:py-9">
              {/* Top meta */}
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {viewingFollowUp ? (
                    <>
                      <Badge tone="indigo">Follow-up</Badge>
                      <button
                        type="button"
                        onClick={() => setTab("interview")}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        ← Back to question {mainIdx + 1}
                      </button>
                    </>
                  ) : (
                    <>
                      <Badge tone={categoryTone(main.category)}>{main.category}</Badge>
                      <Badge tone="neutral">{main.difficulty}</Badge>
                      <StatusPill status={main.status} />
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!viewingFollowUp && (
                    <button
                      type="button"
                      onClick={() =>
                        handlePracticeStatus(main.status === "SKIPPED" ? "NOT_STARTED" : "SKIPPED")
                      }
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <CircleSlash2 className="size-3.5" aria-hidden />
                      {main.status === "SKIPPED" ? "Undo skip" : "Skip"}
                    </button>
                  )}
                  <span className="text-xs font-medium tabular-nums text-zinc-400">
                    {viewingFollowUp ? "Follow-up" : "Question"} {positionInTab} of {totalInTab}
                  </span>
                </div>
              </div>

              {viewingFollowUp ? (
                <>
                  <p className="mt-5 text-xl font-semibold leading-snug tracking-tight text-zinc-950 sm:text-2xl">
                    {activeFollowUp}
                  </p>
                  <div className="mt-5 flex items-start gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-indigo-500" aria-hidden />
                    <p className="text-sm leading-relaxed text-zinc-600">
                      Follow-up to: <span className="text-zinc-800">“{main.question}”</span>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="mt-5 text-xl font-semibold leading-snug tracking-tight text-zinc-950 sm:text-2xl">
                    {main.question}
                  </h2>
                  {main.lastScore != null && (
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-zinc-500 ring-1 ring-inset ring-zinc-200">
                      Last practiced score: <span className="font-semibold text-zinc-900">{main.lastScore}/100</span>
                    </p>
                  )}
                </>
              )}

              {!viewingFollowUp && (
                <>
                  {/* Why it matters */}
                  <section className="mt-8">
                    <h3 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-zinc-900">
                      <Lightbulb className="size-4 text-amber-500" aria-hidden /> Why this question matters
                    </h3>
                    <p className="mt-2.5 text-[15px] leading-relaxed text-zinc-600">{main.reason}</p>
                  </section>

                  {/* Suggested answer */}
                  <section className="mt-8">
                    <SuggestedAnswer answer={main.suggestedAnswer} />
                  </section>
                </>
              )}

              {/* Practice */}
              <section className="mt-8">
                <PracticeSection
                  key={practiceKey}
                  prompt={practicePrompt}
                  questionId={practiceQuestionId}
                  onEvaluated={() => handleEvaluated(activeQuestion.id)}
                />
              </section>

              {/* Follow-up suggestions on the main question view */}
              {!viewingFollowUp && followUps.length > 0 && (
                <section className="mt-10">
                  <h3 className="text-[13px] font-semibold uppercase tracking-wide text-zinc-900">
                    Follow-up questions
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {followUps.map((fup, idx) => (
                      <li key={idx}>
                        <button
                          type="button"
                          onClick={() => selectFollowUp(idx)}
                          className="group flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
                        >
                          <span className="flex items-start gap-2.5">
                            <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-zinc-400 group-hover:text-indigo-500" aria-hidden />
                            <span className="text-sm leading-relaxed text-zinc-700 group-hover:text-zinc-900">
                              {fup}
                            </span>
                          </span>
                          <ArrowRight className="size-4 shrink-0 text-zinc-300 group-hover:text-indigo-500" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>

          {/* Prev / next */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-200 bg-white px-4 py-3 sm:px-6">
            <Button variant="outline" size="sm" onClick={goPrev} disabled={positionInTab <= 1} className="w-32">
              <ChevronLeft className="size-4" aria-hidden /> Previous
            </Button>
            <p className="text-xs font-medium tabular-nums text-zinc-400">
              {viewingFollowUp ? "Follow-up" : "Question"} {positionInTab} of {totalInTab}
            </p>
            <Button size="sm" onClick={goNext} disabled={positionInTab >= totalInTab} className="w-32">
              Next Question <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
