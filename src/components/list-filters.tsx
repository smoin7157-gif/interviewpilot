import Link from "next/link";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExtraQuery } from "@/lib/pagination";

export interface FilterOption {
  value: string;
  label: string;
}

/**
 * Search + status filter bar for the paginated lists.
 *
 * Deliberately server-rendered and JS-free: the search is a plain `GET` form
 * and the status options are links, so the whole filter state lives in the URL
 * next to the pagination cursor. That keeps a filtered list shareable, keeps
 * the back button working, and means the filters never fight the keyset
 * pagination (both pages carry the same query params forward).
 */
export function ListFilters({
  basePath,
  query,
  status,
  statusOptions,
  placeholder = "Search by role or company…",
  className,
}: {
  basePath: string;
  /** Current `?q=` value. */
  query: string;
  /** Current `?status=` value (always one of `statusOptions`). */
  status: string;
  statusOptions: readonly FilterOption[];
  placeholder?: string;
  className?: string;
}) {
  const hasFilters = query.length > 0 || status !== "all";

  /** Build a URL that keeps the current search text and switches the status. */
  const statusHref = (value: string): string => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (value !== "all") params.set("status", value);
    const search = params.toString();
    return search ? `${basePath}?${search}` : basePath;
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-[0_1px_2px_rgba(16,21,40,.04)] sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <form action={basePath} method="get" role="search" className="relative flex-1 sm:max-w-xs">
        {/* Keep the active status when the user runs a new search. */}
        {status !== "all" && <input type="hidden" name="status" value={status} />}
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
          aria-hidden
        />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={placeholder}
          aria-label="Search interviews"
          className="h-10 w-full rounded-full border border-zinc-300 bg-white pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm transition-[border-color,box-shadow] focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
        />
        <button type="submit" className="sr-only">
          Search
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-1.5">
        <div role="group" aria-label="Filter by status" className="flex flex-wrap items-center gap-1.5">
          {statusOptions.map((option) => {
            const active = option.value === status;
            return (
              <Link
                key={option.value}
                href={statusHref(option.value)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                )}
              >
                {option.label}
              </Link>
            );
          })}
        </div>

        {hasFilters && (
          <Link
            href={basePath}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[13px] font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="size-3.5" aria-hidden /> Clear
          </Link>
        )}
      </div>
    </div>
  );
}

/** Query params to carry into pagination links — drops the inert `all` status. */
export function filterQuery(query: string, status: string): ExtraQuery {
  return {
    q: query || undefined,
    status: status !== "all" ? status : undefined,
  };
}
