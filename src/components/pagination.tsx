import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { pageHref, type ExtraQuery } from "@/lib/pagination";

/**
 * Newer/Older controls for a keyset-paginated list.
 *
 * Cursors are opaque ids: "Older" resumes after the current page's last row and
 * "Newer" reopens the page anchored at the current page's first row, so both
 * directions stay correct even if rows were added or deleted in between. Each
 * control only renders when the data layer confirmed that direction exists.
 */
export function Pagination({
  basePath,
  olderCursor,
  newerCursor,
  label,
  query,
}: {
  basePath: string;
  olderCursor: string | null;
  newerCursor: string | null;
  /** Accessible name for the nav landmark, e.g. "Mock history pages". */
  label: string;
  /** Active filters to carry across pages (`?q=` / `?status=`). */
  query?: ExtraQuery;
}) {
  if (!olderCursor && !newerCursor) return null;

  return (
    <nav aria-label={label} className="mt-6 flex items-center justify-between gap-3">
      {newerCursor ? (
        <Link
          href={pageHref(basePath, { cursor: newerCursor, direction: "newer" }, query)}
          rel="prev"
          className={buttonClasses({ variant: "outline", size: "sm" })}
        >
          <ChevronLeft className="size-4" aria-hidden /> Newer
        </Link>
      ) : (
        <span aria-hidden />
      )}
      {olderCursor ? (
        <Link
          href={pageHref(basePath, { cursor: olderCursor, direction: "older" }, query)}
          rel="next"
          className={buttonClasses({ variant: "outline", size: "sm" })}
        >
          Older <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span aria-hidden />
      )}
    </nav>
  );
}
