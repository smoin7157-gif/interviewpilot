import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading skeleton for the app shell pages.
 *
 * A page-shaped skeleton (header, filter bar, rows) tells the user what is
 * about to appear and keeps the layout from jumping when it does — the lone
 * spinner it replaces sat in the middle of an otherwise blank screen.
 */
export default function AppLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-8" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-11 w-40 rounded-full" />
      </div>

      <Skeleton className="mt-6 h-16 w-full rounded-2xl" />

      <div className="mt-4 space-y-3">
        {[0, 1, 2, 3].map((row) => (
          <div
            key={row}
            className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-5"
          >
            <div className="min-w-0 flex-1 space-y-2.5">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="h-9 w-28 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
