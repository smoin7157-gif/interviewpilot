"use client";

import { useState } from "react";
import { LoaderCircle, RotateCcw, Sparkles } from "lucide-react";
import type { DebriefData } from "@/lib/types";
import { DebriefView } from "@/components/debrief-view";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";

/**
 * Generates a debrief for an already-finished mock session (used on the
 * history detail page when no debrief was generated at completion time).
 */
export function DebriefPanel({ mockId }: { mockId: string }) {
  const [loading, setLoading] = useState(false);
  const [debrief, setDebrief] = useState<DebriefData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/mock-interviews/${mockId}/debrief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { debrief?: DebriefData; error?: string };
      if (!res.ok) {
        setError(data.error ?? "We couldn't prepare your debrief.");
        return;
      }
      if (data.debrief) setDebrief(data.debrief);
    } catch {
      setError("We couldn't prepare your debrief.");
    } finally {
      setLoading(false);
    }
  }

  if (debrief) {
    return (
      <div>
        <DebriefView debrief={debrief} tone="light" />
        <p className="mt-3 text-xs text-zinc-400">Saved to this session — it will appear here next time.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-8 text-sm text-zinc-500">
        <LoaderCircle className="size-4 animate-spin text-indigo-500" aria-hidden />
        Preparing your debrief…
      </div>
    );
  }

  const tooFewAnswers = error?.includes("Answer at least");

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-6">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-indigo-500" aria-hidden />
        <h3 className="text-sm font-semibold text-zinc-900">Your debrief</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">
        {tooFewAnswers
          ? error
          : "Score this session across six dimensions — technical, communication, structure, relevance, project knowledge, and problem solving — from the stored transcript."}
      </p>
      {!tooFewAnswers && (
        <button
          type="button"
          onClick={() => void generate()}
          disabled={loading}
          className={cn(buttonClasses({ className: "mt-4" }))}
        >
          {error ? (
            <>
              <RotateCcw className="size-4" aria-hidden /> Try again
            </>
          ) : (
            <>
              <Sparkles className="size-4" aria-hidden /> Generate debrief
            </>
          )}
        </button>
      )}
    </div>
  );
}