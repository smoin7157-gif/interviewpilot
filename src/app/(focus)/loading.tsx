import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading skeleton for the dark mock-interview screen — shaped like
 * the preflight card so the dark shell doesn't flash an empty page first.
 */
export default function FocusLoading() {
  return (
    <div
      className="flex h-full items-start justify-center overflow-y-auto px-4 py-8 sm:px-6 sm:py-12"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Loading…</span>
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-4 w-16 bg-zinc-800" />
          <Skeleton className="h-3 w-32 bg-zinc-800" />
        </div>
        <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8">
          <Skeleton className="h-3 w-40 bg-zinc-800" />
          <Skeleton className="h-8 w-3/4 bg-zinc-800" />
          <Skeleton className="h-4 w-full bg-zinc-800" />
          <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
            {[0, 1, 2, 3].map((cell) => (
              <Skeleton key={cell} className="h-14 w-full bg-zinc-800" />
            ))}
          </div>
          <Skeleton className="h-14 w-full bg-zinc-800" />
          <Skeleton className="h-11 w-full rounded-full bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
