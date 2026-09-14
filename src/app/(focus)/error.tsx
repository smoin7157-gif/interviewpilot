"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";

/**
 * Error boundary for the focused mock-interview screen. Renders dark to match
 * its parent layout — the global (light) boundary looks broken when it
 * appears inside the dark shell mid-session.
 */
export default function FocusError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[focus] mock interview error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex h-dvh items-center justify-center bg-zinc-950 px-6 text-white">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-500/15 text-red-400">
          <TriangleAlert className="size-7" aria-hidden />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
          The mock interview hit a snag.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#b8c0de]">
          Your session and transcript are saved. Try resuming, or step out and pick it back up
          from your interview workspace.
        </p>
        {error.digest && <p className="mt-3 text-xs text-zinc-500">Error reference: {error.digest}</p>}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={reset}>
            <RefreshCw className="size-4" aria-hidden /> Resume
          </Button>
          <Link href="/interviews" className={buttonClasses({ size: "lg", variant: "outline" })}>
            Back to my interviews
          </Link>
        </div>
      </div>
    </div>
  );
}
