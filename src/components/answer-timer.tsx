"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { cn, formatClock } from "@/lib/utils";

/**
 * Target answer length. The question engine is prompted to keep questions
 * answerable aloud in 1–2 minutes, so 2:00 is the pace a real answer here is
 * expected to fit in.
 */
const TARGET_SECONDS = 120;

type TimerState = "idle" | "running" | "paused";

/**
 * Optional per-question stopwatch for the written-practice panel.
 *
 * Practice is about delivery as much as content: a typed answer that would run
 * four minutes aloud is a different answer from one that fits in two, and there
 * is no way to feel that while typing. The timer is opt-in (it never starts on
 * its own) and turns amber past the 2:00 target, red past double it.
 *
 * Elapsed time is computed from timestamps rather than counted ticks, so a
 * backgrounded tab that throttles timers still reports the true duration.
 */
export function AnswerTimer({ className }: { className?: string }) {
  const [state, setState] = useState<TimerState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef(0);
  // Time banked by previous run segments, so pause/resume doesn't lose any.
  const bankedMsRef = useRef(0);

  useEffect(() => {
    if (state !== "running") return;
    const tick = () => setElapsedMs(bankedMsRef.current + (Date.now() - startedAtRef.current));
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [state]);

  const start = useCallback(() => {
    startedAtRef.current = Date.now();
    setState("running");
  }, []);

  const pause = useCallback(() => {
    bankedMsRef.current += Date.now() - startedAtRef.current;
    setElapsedMs(bankedMsRef.current);
    setState("paused");
  }, []);

  const reset = useCallback(() => {
    bankedMsRef.current = 0;
    startedAtRef.current = 0;
    setElapsedMs(0);
    setState("idle");
  }, []);

  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const overTarget = elapsedSeconds >= TARGET_SECONDS;
  const wellOverTarget = elapsedSeconds >= TARGET_SECONDS * 2;
  const progress = Math.min(100, Math.round((elapsedSeconds / TARGET_SECONDS) * 100));

  const control = "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span
          role="timer"
          aria-label="Elapsed time on this answer"
          className={cn(
            "text-sm font-semibold tabular-nums",
            wellOverTarget ? "text-red-600" : overTarget ? "text-amber-600" : "text-zinc-700"
          )}
        >
          {formatClock(elapsedSeconds)}
        </span>
        <span className="text-[11px] text-zinc-400">
          target {formatClock(TARGET_SECONDS)}
        </span>

        {state === "running" ? (
          <button type="button" onClick={pause} className={cn(control, "text-zinc-600 hover:bg-zinc-100")}>
            <Pause className="size-3.5" aria-hidden /> Pause
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            className={cn(control, "text-indigo-600 hover:bg-indigo-50")}
          >
            <Play className="size-3.5" aria-hidden />
            {state === "paused" ? "Resume" : "Time this answer"}
          </button>
        )}

        {elapsedMs > 0 && (
          <button type="button" onClick={reset} className={cn(control, "text-zinc-500 hover:bg-zinc-100")}>
            <RotateCcw className="size-3.5" aria-hidden /> Reset
          </button>
        )}
      </div>

      {elapsedMs > 0 && (
        <div className="mt-1.5 h-0.5 w-full max-w-56 overflow-hidden rounded-full bg-zinc-100" role="presentation">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              wellOverTarget ? "bg-red-500" : overTarget ? "bg-amber-500" : "bg-indigo-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
