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
  Mic,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Sparkles,
  X,
} from "lucide-react";
import type { EvaluationFeedback, WorkspaceQuestion, WorkspaceSession } from "@/lib/types";
import { mockHref, practiceSearch, type PracticePosition } from "@/lib/practice-position";
import { saveAnswerDraftAction } from "@/lib/draft-actions";
import {
  cn,
  countWords,
  estimateSpeakingSeconds,
  FOCUSABLE_SELECTOR,
  formatClock,
  formatQuestionCategory,
  formatQuestionDifficulty,
  pluralize,
} from "@/lib/utils";
import { AnswerTimer } from "@/components/answer-timer";
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
          {isFollowUp ? "Follow-up" : formatQuestionCategory(question.category)}
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
                sourceContext: [],
                orderIndex: idx,
                status: "NOT_STARTED",
                lastScore: null,
                draftAnswer: null,
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

const DRAFT_SAVE_DELAY_MS = 2500;

type DraftSaveState = "idle" | "saving" | "saved" | "error";

/**
 * Read the unconfirmed draft buffer; safe during SSR and when storage is
 * unavailable. A buffer only exists when a typed answer has not been confirmed
 * by a save yet, so when present it is newer than the server copy.
 */
function readDraftBuffer(storageKey: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved !== null && saved.trim().length > 0 ? saved : null;
  } catch {
    // Storage unavailable (private mode, quota) — skip restore.
    return null;
  }
}

/** Best-effort buffer write — storage can be unavailable (private mode, quota). */
function writeDraftBuffer(storageKey: string, text: string) {
  try {
    window.localStorage.setItem(storageKey, text);
  } catch {
    // The server copy is still the source of truth.
  }
}

/** Best-effort buffer removal. */
function removeDraftBuffer(storageKey: string) {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Ignore.
  }
}

/**
 * Draft autosave for written practice.
 *
 * The answer is persisted on the server (`InterviewQuestion.draftAnswer`) so a
 * refresh, crash, or closed tab can't lose it — device-local storage alone
 * couldn't follow the user to another browser. Saves are debounced ~2.5s behind
 * the last keystroke and flushed immediately when the tab hides, the page
 * unloads, or the panel leaves the screen (switching questions is an in-app
 * navigation, so it never fires `beforeunload`). `pagehide` covers Safari,
 * where `beforeunload` is unreliable.
 *
 * The local buffer is the crash net: it holds the text typed since the last
 * *confirmed* save and is written synchronously before every save attempt, so a
 * request that never lands (killed tab, offline) is replayed on the next visit
 * and re-saved. It's read once in the lazy state initializer — nothing
 * text-dependent renders until the panel is opened, so hydration is unaffected.
 *
 * Follow-up answers share their question's row, so only the main answer is
 * persisted server-side; follow-ups keep the device-local draft they had.
 */
function useAnswerDraft({
  questionId,
  storageKey,
  initialDraft,
  persistToServer,
  onDraftChange,
}: {
  questionId: string;
  storageKey: string;
  initialDraft: string;
  persistToServer: boolean;
  onDraftChange?: (storageKey: string, text: string) => void;
}) {
  // An unconfirmed buffer wins over the server copy — by definition it is newer.
  const [initial] = useState(() => {
    const buffered = readDraftBuffer(storageKey);
    return { text: buffered ?? initialDraft, unconfirmed: buffered !== null };
  });
  const [text, setText] = useState(initial.text);
  const [restored, setRestored] = useState(initial.text.trim().length > 0);
  // The text most recently confirmed by the store — the save indicator is
  // derived from it, so no state has to be pushed from inside the debounce
  // effect. A restored buffer starts unconfirmed ("saving") on purpose: the
  // debounce below then pushes it to the server.
  const [savedText, setSavedText] = useState(initial.unconfirmed ? "" : initialDraft);
  const [failed, setFailed] = useState(false);

  // Latest text / confirmed text, so the flush listeners read current values
  // without being torn down and re-registered on every keystroke.
  const latestText = useRef(text);
  const confirmedText = useRef(initial.unconfirmed ? "" : initialDraft);
  useEffect(() => {
    latestText.current = text;
  }, [text]);

  // Publish each edit to the caller (keyed by storage key) so returning to this
  // question before a page reload shows the draft the user just typed.
  useEffect(() => {
    onDraftChange?.(storageKey, text);
  }, [text, storageKey, onDraftChange]);

  const persist = useCallback(
    async (value: string) => {
      const isEmpty = value.trim().length === 0;
      if (!persistToServer) {
        // Buffer-only fallback (follow-up prompts).
        if (isEmpty) removeDraftBuffer(storageKey);
        else writeDraftBuffer(storageKey, value);
        confirmedText.current = value;
        setSavedText(value);
        setFailed(false);
        return;
      }

      // Buffer first: if the request never completes, the text is still here.
      if (isEmpty) removeDraftBuffer(storageKey);
      else writeDraftBuffer(storageKey, value);

      try {
        const result = await saveAnswerDraftAction(questionId, value);
        if (!result.ok) {
          setFailed(true);
          return;
        }
        confirmedText.current = value;
        setSavedText(value);
        setFailed(false);
        // Confirmed server-side — the crash net is no longer needed. An emptied
        // field clears the stored draft so stale text can't resurface later.
        removeDraftBuffer(storageKey);
      } catch {
        // Offline / server error — keep the buffer and retry on the next edit.
        setFailed(true);
      }
    },
    [persistToServer, questionId, storageKey]
  );

  // Debounced save once typing pauses.
  useEffect(() => {
    if (text === savedText) return;
    const timer = window.setTimeout(() => void persist(latestText.current), DRAFT_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [text, savedText, persist]);

  // Flush the last few seconds on tab hide / page unload / unmount.
  const flush = useCallback(() => {
    if (latestText.current === confirmedText.current) return;
    void persist(latestText.current);
  }, [persist]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") flush();
    }
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      flush();
    };
  }, [flush]);

  function discardDraft() {
    removeDraftBuffer(storageKey);
    confirmedText.current = "";
    setText("");
    setSavedText("");
    setRestored(false);
    setFailed(false);
    // Drop the stored draft too, so it can't come back on the next visit.
    if (persistToServer) void saveAnswerDraftAction(questionId, "").catch(() => {});
  }

  /**
   * Forget the stored draft but keep the text on screen. Used once an answer
   * has been submitted and scored: the answer is now an attempt, a fresh draft
   * would only duplicate it, and clearing the box out from under the user
   * (seconds after their feedback appears) read as lost work.
   */
  function clearStoredDraft() {
    removeDraftBuffer(storageKey);
    confirmedText.current = text;
    setSavedText(text);
    setFailed(false);
    if (persistToServer) void saveAnswerDraftAction(questionId, "").catch(() => {});
  }

  const saveState: DraftSaveState =
    text.trim().length === 0
      ? "idle"
      : failed
        ? "error"
        : text === savedText
          ? "saved"
          : "saving";

  return { text, setText, restored, saveState, discardDraft, clearStoredDraft };
}

function PracticeSection({
  prompt,
  questionId,
  storageKey,
  initialDraft,
  persistToServer,
  onDraftChange,
  onEvaluated,
  nextAction,
  className,
}: {
  prompt: string;
  questionId: string;
  storageKey: string;
  initialDraft: string;
  persistToServer: boolean;
  onDraftChange?: (storageKey: string, text: string) => void;
  onEvaluated: (feedback: EvaluationFeedback) => void;
  /** Offered next to the feedback so practice loops answer → feedback → next. */
  nextAction?: { label: string; onClick: () => void } | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { text, setText, restored, saveState, discardDraft, clearStoredDraft } = useAnswerDraft({
    questionId,
    storageKey,
    initialDraft,
    persistToServer,
    onDraftChange,
  });
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<EvaluationFeedback | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  // Synchronous guard so a double-click can't submit the same answer twice.
  const evaluatingRef = useRef(false);

  async function handleEvaluate() {
    if (evaluatingRef.current) return;
    if (text.trim().length < PRACTICE_MIN_LENGTH) {
      setError("Write at least a few sentences before evaluating.");
      return;
    }
    evaluatingRef.current = true;
    setEvaluating(true);
    setError(null);
    try {
      const res = await fetch(`/api/questions/${questionId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: text.trim(), prompt }),
      });
      const data = (await res.json()) as EvaluationFeedback & { error?: string };
      if (!res.ok) {
        if (res.status === 429) {
          // Honor the server's Retry-After like the debrief panel does.
          const retryAfter = Number(res.headers.get("Retry-After"));
          const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : null;
          throw new Error(
            wait
              ? `You're evaluating quickly — try again in about ${wait < 90 ? `${wait}s` : `${Math.ceil(wait / 60)} min`}.`
              : "You're evaluating quickly — please wait a minute and try again."
          );
        }
        throw new Error(data.error ?? "We couldn't get feedback on that answer. Please try again in a moment.");
      }
      const fb: EvaluationFeedback = {
        score: data.score,
        strengths: data.strengths ?? [],
        missing: data.missing ?? [],
        improvements: data.improvements ?? [],
      };
      setFeedback(fb);
      onEvaluated(fb);
      // The answer is now persisted server-side as an attempt — drop the stored
      // draft, but leave the text visible beside its feedback.
      clearStoredDraft();
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't get feedback on that answer. Please try again in a moment.");
    } finally {
      evaluatingRef.current = false;
      setEvaluating(false);
    }
  }

  const words = countWords(text);

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
          {restored && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-700">
              <span>
                {persistToServer
                  ? "We saved your draft — pick up where you left off."
                  : "Restored your unsent draft from this device."}
              </span>
              <button
                type="button"
                onClick={discardDraft}
                className="shrink-0 font-medium text-indigo-600 underline-offset-2 hover:underline"
              >
                Discard
              </button>
            </div>
          )}
          <Textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your answer here…"
            aria-label="Your practice answer"
          />
          {/* Length feedback: word count (no live region — it would announce
              every keystroke) plus an optional stopwatch to see whether the
              answer would actually fit a real interview slot. */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <AnswerTimer />
            <p className="text-xs tabular-nums text-zinc-400">
              {words} {pluralize(words, "word")}
              {words > 0 && ` · about ${formatClock(estimateSpeakingSeconds(text))} spoken`}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-xs text-zinc-400" aria-live="polite">
              {text.trim().length === 0 ? (
                "Be specific — the feedback is based on your actual answer."
              ) : saveState === "saving" ? (
                "Saving…"
              ) : saveState === "error" ? (
                <span className="text-amber-600">Couldn&rsquo;t save — your text is still safe here.</span>
              ) : (
                <>
                  <Check className="size-3.5 text-emerald-500" strokeWidth={3} aria-hidden />
                  Saved
                </>
              )}
            </p>
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
          {nextAction && (
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={nextAction.onClick}>
                {nextAction.label} <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Shown once every question has been practiced.
 *
 * Written practice used to just... continue to the next question with no
 * acknowledgement that the set was finished, so the natural next step (rehearse
 * it aloud) was only discoverable from the header. This makes finishing visible
 * and puts the spoken mock one click away.
 */
function AllPracticedBanner({ onStartMock }: { onStartMock: () => void }) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
          <CheckCircle2 className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Written practice complete
          </p>
          <h2 className="mt-1 text-base font-bold tracking-[-0.01em] text-zinc-950">
            You&rsquo;ve practiced every question.
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-600">
            Now rehearse it aloud with the AI interviewer to test your delivery under pressure.
          </p>
        </div>
      </div>
      <Button onClick={onStartMock} className="shrink-0">
        <Mic className="size-4" aria-hidden /> Practice aloud
      </Button>
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
  initialPosition,
}: {
  session: WorkspaceSession;
  initialQuestions: WorkspaceQuestion[];
  /** Where the URL says to open; resolved server-side against the real questions. */
  initialPosition: PracticePosition;
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState<WorkspaceQuestion[]>(initialQuestions);
  // The URL wins (a refresh, a bookmark or a link back from the spoken mock),
  // and with nothing requested the first unpracticed question is the resume
  // point. See resolvePracticePosition for the fallback rules.
  const [mainIdx, setMainIdx] = useState(() => initialPosition.mainIdx);
  const [tab, setTab] = useState<Tab>(initialPosition.tab);
  const [fupIdx, setFupIdx] = useState(initialPosition.followUpIdx);
  // Distraction-free reading: collapses the desktop question list so a long
  // question or a suggested answer can be read without the index beside it.
  // Session-scoped on purpose — a persisted preference would need a post-mount
  // sync that flashes the wrong layout on first paint.
  const [focusMode, setFocusMode] = useState(false);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const mobileListRef = useRef<HTMLDivElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const detailScrollRef = useRef<HTMLDivElement>(null);
  const [skipping, setSkipping] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const skippingRef = useRef(false);
  // Drafts typed in this page session, keyed by practice key. A PracticeSection
  // unmounts when its question is left behind, and a confirmed save clears the
  // local crash buffer — without this, coming back to that question before a
  // page reload would show an empty box over a draft that does exist on the
  // server. One shallow record updated per keystroke.
  const [pageDrafts, setPageDrafts] = useState<Record<string, string>>({});
  const rememberDraft = useCallback((key: string, value: string) => {
    setPageDrafts((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);

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

  // Mobile question list is a modal drawer: lock background scroll, move focus
  // inside, and close on Escape — the same behaviour as the app-shell drawer,
  // so a phone user is never stranded inside an overlay.
  useEffect(() => {
    if (!mobileListOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    mobileCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileListOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const container = mobileListRef.current;
      if (!container) return;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileListOpen]);

  // Keep the address bar on the question being viewed, so refreshing, sharing
  // or returning from the mock lands back here instead of on question 1. The
  // native history API is deliberate: a router navigation would re-run the
  // server page (and its database reads) on every question click.
  useEffect(() => {
    const question = mainIdx >= 0 ? questions[mainIdx] : undefined;
    if (!question) return;
    const followUpCount = question.followUps?.length ?? 0;
    const followUp = tab === "followup" && followUpCount > 0 ? fupIdx : undefined;
    const next = `${window.location.pathname}${practiceSearch(question.id, followUp)}`;
    if (`${window.location.pathname}${window.location.search}` !== next) {
      window.history.replaceState(null, "", next);
    }
  }, [mainIdx, fupIdx, tab, questions]);

  // Selecting another question should start you at its top. Without this the
  // detail pane keeps the previous question's scroll position, so a click in
  // the list lands you halfway down a question you have not read yet.
  useEffect(() => {
    detailScrollRef.current?.scrollTo({ top: 0 });
  }, [mainIdx, fupIdx, tab]);

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
    if (!main || skippingRef.current) return;
    skippingRef.current = true;
    setSkipping(true);
    setStatusError(null);
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
        // A silently ignored failure made Skip look like a dead button — say so
        // instead, and leave the question's real status untouched.
        setStatusError("Couldn't save that — check your connection and try again.");
      })
      .finally(() => {
        skippingRef.current = false;
        setSkipping(false);
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
  const draftStorageKey = `draft:answer:${practiceKey}`;
  const currentDraft = pageDrafts[draftStorageKey];

  const totalInTab = viewingFollowUp ? followUps.length : questions.length;
  const positionInTab = viewingFollowUp ? (fupIdx >= followUps.length ? 1 : fupIdx + 1) : mainIdx + 1;

  // What comes after this answer: the next follow-up, back to the question, or
  // the next question. Offered inside the feedback block so finishing an answer
  // doesn't require hunting for the bottom bar.
  const nextAction = viewingFollowUp
    ? fupIdx + 1 < followUps.length
      ? { label: "Next follow-up", onClick: () => selectFollowUp(fupIdx + 1) }
      : { label: "Back to the question", onClick: () => setTab("interview") }
    : mainIdx + 1 < questions.length
      ? { label: "Next question", onClick: () => selectMain(mainIdx + 1) }
      : // Last question: point at the spoken mock rather than dead-ending.
        { label: "Practice aloud", onClick: () => router.push(mockLink) };

  const goNext = () =>
    viewingFollowUp
      ? setFupIdx((i) => Math.min(i + 1, followUps.length - 1))
      : setMainIdx((i) => Math.min(i + 1, questions.length - 1));

  // Every route into the mock names this question, so the mock's "Back to
  // practice" links return here rather than to question 1.
  const mockLink = mockHref(session.id, activeQuestion.id);

  // The bottom bar never dead-ends. The last follow-up goes back to its
  // question, and the last question hands off to the spoken mock instead of
  // showing a disabled "Next" the user has to work around.
  const footerNext = viewingFollowUp
    ? positionInTab >= totalInTab
      ? { label: "Back to question", onClick: () => setTab("interview"), direction: "back" as const }
      : { label: "Next follow-up", onClick: goNext, direction: "forward" as const }
    : positionInTab >= totalInTab
      ? { label: "Practice aloud", onClick: () => router.push(mockLink), direction: "forward" as const }
      : { label: "Next question", onClick: goNext, direction: "forward" as const };
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
          <button
            type="button"
            onClick={() => setFocusMode((value) => !value)}
            aria-pressed={focusMode}
            title={focusMode ? "Show the question list" : "Hide the question list"}
            className="hidden items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-[13px] font-semibold text-zinc-600 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 md:inline-flex"
          >
            {focusMode ? (
              <PanelLeftOpen className="size-3.5" aria-hidden />
            ) : (
              <PanelLeftClose className="size-3.5" aria-hidden />
            )}
            {focusMode ? "Show list" : "Focus"}
          </button>
          <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-zinc-100 sm:block" role="presentation">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${(practicedCount / questions.length) * 100}%` }}
            />
          </div>
          <span className="hidden shrink-0 text-xs font-medium tabular-nums text-zinc-500 sm:block">
            {practicedCount}/{questions.length} practiced
          </span>
          <Link
            href={mockLink}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-zinc-800 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Mic className="size-3.5 text-indigo-600" aria-hidden />
            <span className="hidden sm:inline">Practice aloud</span>
            <span className="sm:hidden">Mock</span>
          </Link>
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
          <div
            ref={mobileListRef}
            role="dialog"
            aria-modal="true"
            aria-label="Question list"
            className="absolute inset-y-0 left-0 z-10 flex w-[85%] max-w-sm flex-col bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <span className="text-sm font-semibold text-zinc-900">Questions</span>
              <button
                ref={mobileCloseRef}
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
        {/* Desktop list — hidden in focus mode, where the mobile slide-over
            still opens it on small screens. */}
        {!focusMode && (
          <aside className="hidden w-80 shrink-0 border-r border-zinc-200 bg-white md:block xl:w-96">
            {listContent}
          </aside>
        )}

        {/* Detail */}
        <section
          aria-label="Question detail"
          className="flex min-w-0 flex-1 flex-col bg-zinc-50/50"
        >
          <div ref={detailScrollRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-8 sm:py-9">
              {practicedCount === questions.length && questions.length > 0 && (
                <AllPracticedBanner onStartMock={() => router.push(mockLink)} />
              )}

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
                      <Badge tone={categoryTone(main.category)}>{formatQuestionCategory(main.category)}</Badge>
                      <Badge tone="neutral">{formatQuestionDifficulty(main.difficulty)}</Badge>
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
                      disabled={skipping}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50"
                    >
                      <CircleSlash2 className="size-3.5" aria-hidden />
                      {skipping ? "Skipping…" : main.status === "SKIPPED" ? "Undo skip" : "Skip"}
                    </button>
                  )}
                  {statusError && (
                    <span role="alert" className="text-xs font-medium text-amber-600">
                      {statusError}
                    </span>
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
                  storageKey={draftStorageKey}
                  // Only the question's own answer has a row to live on; a
                  // follow-up draft would otherwise overwrite it.
                  initialDraft={currentDraft ?? (viewingFollowUp ? "" : (activeQuestion.draftAnswer ?? ""))}
                  persistToServer={!viewingFollowUp}
                  onDraftChange={rememberDraft}
                  onEvaluated={() => handleEvaluated(activeQuestion.id)}
                  nextAction={nextAction}
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
            <p className="text-center text-xs font-medium tabular-nums text-zinc-400">
              {viewingFollowUp ? "Follow-up" : "Question"} {positionInTab} of {totalInTab}
              <span className="mt-0.5 block font-normal text-zinc-300">
                Use <kbd className="font-sans">←</kbd> <kbd className="font-sans">→</kbd> to move
              </span>
            </p>
            <Button size="sm" onClick={footerNext.onClick} className="w-36">
              {footerNext.direction === "back" ? (
                <ArrowLeft className="size-4" aria-hidden />
              ) : null}
              {footerNext.label}
              {footerNext.direction === "forward" ? (
                <ArrowRight className="size-4" aria-hidden />
              ) : null}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
