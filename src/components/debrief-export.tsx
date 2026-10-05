"use client";

/**
 * Debrief export controls (InterviewOS Phase 4 polish). Renders two actions —
 * copy to clipboard and download a `.md` file — over the shared serializer in
 * `src/lib/debrief-export.ts`. Works with a debrief, a transcript, or both, so
 * a not-yet-scored session can still take its transcript away.
 */

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import type { DebriefData } from "@/lib/types";
import {
  buildDebriefMarkdown,
  debriefExportFileName,
  type DebriefExportMeta,
  type DebriefExportTurn,
} from "@/lib/debrief-export";
import { cn } from "@/lib/utils";

export function DebriefExport({
  debrief,
  meta,
  turns = [],
  tone = "light",
  className,
}: {
  debrief?: DebriefData | null;
  meta: DebriefExportMeta;
  turns?: DebriefExportTurn[];
  tone?: "dark" | "light";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const hasTranscript = turns.some((turn) => turn.text?.trim());
  if (!debrief && !hasTranscript) return null;

  async function copy() {
    setError(null);
    try {
      await navigator.clipboard.writeText(buildDebriefMarkdown({ meta, debrief, turns }));
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy — your browser blocked clipboard access.");
    }
  }

  function download() {
    setError(null);
    try {
      const blob = new Blob([buildDebriefMarkdown({ meta, debrief, turns })], {
        type: "text/markdown;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = debriefExportFileName(meta);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Couldn't download the export.");
    }
  }

  const buttonClass = cn(
    "inline-flex select-none items-center justify-center gap-1.5 rounded-full px-4 h-8 text-[13px] font-semibold tracking-[-0.01em] transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
    tone === "dark"
      ? "border border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 focus-visible:ring-offset-zinc-950"
      : "border border-zinc-300 bg-white text-zinc-900 shadow-sm hover:border-zinc-400 hover:bg-zinc-50"
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className={cn("text-xs font-medium", tone === "dark" ? "text-zinc-500" : "text-zinc-400")}>
        {debrief ? "Export this debrief" : "Export this transcript"}
      </span>
      <div role="group" aria-label="Export mock debrief" className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void copy()} className={buttonClass}>
          {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          {copied ? "Copied" : "Copy as Markdown"}
        </button>
        <button type="button" onClick={download} className={buttonClass}>
          <Download className="size-3.5" aria-hidden />
          Download .md
        </button>
      </div>
      {error && (
        <p role="alert" className={cn("text-xs", tone === "dark" ? "text-red-400" : "text-red-600")}>
          {error}
        </p>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {copied ? "Debrief copied to clipboard." : ""}
      </p>
    </div>
  );
}
