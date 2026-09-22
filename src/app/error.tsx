"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";

/**
 * Global error boundary. When an unexpected server/client error escapes a
 * route, users get a branded recovery screen with a retry — never a raw
 * framework stack screen. The digest is shown so a support request can be
 * correlated with the server logs without exposing internals.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] unhandled route error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#fbfcfe] px-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <TriangleAlert className="size-7" aria-hidden />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
          This page hit an unexpected error.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-zinc-500">
          An unexpected error interrupted this page. Your interviews and practice history are
          unaffected — try again, or head back to your dashboard.
        </p>
        {error.digest && (
          <p className="mt-3 text-xs text-zinc-400">Error reference: {error.digest}</p>
        )}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={reset}>
            <RefreshCw className="size-4" aria-hidden /> Try again
          </Button>
          <Link href="/dashboard" className={buttonClasses({ size: "lg", variant: "outline" })}>
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
