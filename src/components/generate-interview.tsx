"use client";

import { useEffect, useState } from "react";
import { Check, CircleAlert, Loader2, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonClasses } from "@/components/ui/button";

export type GenerationContextPayload = {
  role: string;
  seniority: string;
  company?: string | null;
  companyType?: string | null;
  interviewType?: string | null;
  jobDescription?: string | null;
  count: number;
};

type StageKey = "analyzing" | "questions" | "followups" | "saving";

const STAGES: { key: StageKey; label: string; detail: string }[] = [
  { key: "analyzing", label: "Analyzing the role", detail: "Weighing job description, role, experience and interview type" },
  { key: "questions", label: "Creating relevant questions", detail: "Building a realistic question set" },
  { key: "followups", label: "Preparing follow-up questions", detail: "Adding deeper probing questions" },
  { key: "saving", label: "Finalizing your interview", detail: "Saving your session so you can return anytime" },
];

type ServerEvent =
  | { type: "stage"; key: StageKey }
  | { type: "done"; questionCount: number; provider: string; model?: string }
  | { type: "error"; message: string };

async function streamGenerate(
  sessionId: string,
  onEvent: (event: ServerEvent) => void,
  signal: AbortSignal
): Promise<void> {
  const res = await fetch(`/api/interviews/${sessionId}/generate`, {
    method: "POST",
    headers: { Accept: "application/x-ndjson" },
    signal,
  });

  if (!res.ok || !res.body) {
    let message = "We couldn't generate your interview.";
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // keep default
    }
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      let event: ServerEvent;
      try {
        event = JSON.parse(line) as ServerEvent;
      } catch {
        continue;
      }
      onEvent(event);
      if (event.type === "error") throw new Error(event.message);
    }
  }
}

type Phase = "generating" | "done" | "error";

export function GeneratePanel({
  sessionId,
  context,
  onDone,
  title = "Building your interview…",
}: {
  sessionId: string;
  context: GenerationContextPayload;
  onDone: (info: { questionCount: number; source: string }) => void;
  title?: string;
}) {
  const [phase, setPhase] = useState<Phase>("generating");
  const [stageIndex, setStageIndex] = useState(0);
  const [doneInfo, setDoneInfo] = useState<{ questionCount: number; source: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    async function run() {
      try {
        await streamGenerate(
          sessionId,
          (event) => {
            if (disposed) return;
            if (event.type === "stage") {
              const idx = STAGES.findIndex((s) => s.key === event.key);
              if (idx >= 0) setStageIndex(idx);
            } else if (event.type === "done") {
              setDoneInfo({ questionCount: event.questionCount, source: event.provider });
            }
          },
          controller.signal
        );
        if (!disposed) setPhase("done");
      } catch (err) {
        if (disposed || controller.signal.aborted) return;
        setPhase("error");
        setError(
          err instanceof Error ? err.message : "We couldn't generate your interview. Please try again."
        );
      }
    }
    void run();
    return () => {
      disposed = true;
      controller.abort();
    };
  }, [sessionId, attempt]);

  function retry() {
    setPhase("generating");
    setStageIndex(0);
    setError(null);
    setDoneInfo(null);
    setAttempt((n) => n + 1);
  }

  if (phase === "error") {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-red-200 bg-white p-8 text-center shadow-[0_1px_2px_rgba(16,21,40,.05),0_16px_40px_-24px_rgba(199,66,99,.35)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(199,66,99,.12), transparent)" }}
        />
        <div className="relative mx-auto flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <CircleAlert className="size-6" aria-hidden />
        </div>
        <h3 className="relative mt-4 text-base font-semibold text-zinc-950">We couldn&rsquo;t generate your interview.</h3>
        <p className="relative mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-zinc-500">
          {error ?? "We couldn't reach the AI service to build your interview. Check your connection and try again — your session is safe."}
        </p>
        <Button className="relative mt-6" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }

  if (phase === "done" && doneInfo) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-[0_1px_2px_rgba(16,21,40,.05),0_16px_40px_-24px_rgba(23,163,154,.35)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full opacity-70 blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(23,163,154,.14), transparent)" }}
        />
        <div className="relative mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <PartyPopper className="size-6" aria-hidden />
        </div>
        <h3 className="relative mt-4 text-lg font-semibold text-zinc-950">Interview ready</h3>
        <p className="relative mt-1 text-sm text-zinc-500">
          {doneInfo.questionCount} questions generated for {context.role}.
        </p>
        {doneInfo.source === "fallback" && (
          <p className="relative mx-auto mt-3 max-w-sm rounded-lg bg-amber-50 px-3 py-2 text-[13px] leading-snug text-amber-800">
            Live AI was unavailable, so we used InterviewOS&rsquo;s built-in question bank. Everything works
            the same — configure OPENROUTER_API_KEY to get fully tailored questions.
          </p>
        )}
        <button
          type="button"
          className={buttonClasses({ size: "lg", className: "relative mt-6" })}
          onClick={() => onDone({ questionCount: doneInfo.questionCount, source: doneInfo.source })}
        >
          Start Interview
        </button>
      </div>
    );
  }

  const progressPct = Math.round(((stageIndex + 0.5) / STAGES.length) * 100);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-8 shadow-[0_1px_2px_rgba(16,21,40,.05),0_16px_40px_-24px_rgba(61,78,224,.3)]">
      {/* Ambient brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[28rem] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
        style={{
          background: "radial-gradient(closest-side, rgba(61,78,224,.12), rgba(110,92,245,.08), transparent)",
        }}
      />
      {/* Top progress bar */}
      <div className="absolute inset-x-0 top-0 h-1 bg-zinc-100" role="presentation">
        <div
          className="h-full rounded-r-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-700 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="relative flex items-center gap-3">
        <Loader2 className="size-5 animate-spin text-indigo-600" aria-hidden />
        <div>
          <h3 className="text-base font-semibold text-zinc-950">{title}</h3>
          <p className="text-[13px] text-zinc-500">
            {context.role} · {context.seniority}
            {context.interviewType ? ` · ${context.interviewType}` : ""}
            {context.company ? ` · ${context.company}` : ""} · {context.count} questions
          </p>
        </div>
      </div>

      <ol className="relative mt-6 space-y-4">
        {/* Connecting line between stage markers */}
        <span
          aria-hidden
          className="absolute bottom-3 left-[9px] top-3 w-px bg-gradient-to-b from-indigo-200 via-zinc-200 to-transparent"
        />
        {STAGES.map((stage, idx) => {
          const isDone = idx < stageIndex;
          const isCurrent = idx === stageIndex;
          const isPending = idx > stageIndex;
          return (
            <li key={stage.key} className="relative flex items-start gap-3">
              <span
                className={cn(
                  "z-10 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border bg-white",
                  isDone && "border-emerald-200 bg-emerald-50 text-emerald-600",
                  isCurrent && "border-indigo-300 bg-indigo-50 text-indigo-600 shadow-[0_0_0_4px_rgba(61,78,224,.08)]",
                  isPending && "border-zinc-200 bg-zinc-50 text-zinc-300"
                )}
                aria-hidden
              >
                {isDone ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : isCurrent ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <span className="size-1 rounded-full bg-current" />
                )}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isPending ? "text-zinc-400" : "text-zinc-900"
                  )}
                >
                  {stage.label}
                  <span className="sr-only">{isDone ? "complete" : isCurrent ? "in progress" : "queued"}</span>
                </p>
                <p className={cn("mt-0.5 text-[13px]", isPending ? "text-zinc-300" : "text-zinc-500")}>
                  {stage.detail}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="relative mt-6 text-xs text-zinc-400">
        Generation takes 20–40 seconds. You can leave this page — your session is saved automatically.
      </p>
      <span className="sr-only" aria-live="polite">
        {stageIndex === STAGES.length - 1 ? "Almost done" : `Step ${stageIndex + 1} of ${STAGES.length}`}
      </span>
    </div>
  );
}
