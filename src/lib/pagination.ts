/**
 * Cursor pagination primitives shared by the interview and mock-history lists.
 *
 * Both lists are keyset-paginated (Prisma's `cursor` + `skip`) instead of being
 * loaded whole, so page cost stays flat as a user's session count grows. A
 * `?cursor=<id>&dir=older|newer` pair travels in the URL, which keeps the pages
 * linkable and the back button working — no client state, no page numbers that
 * shift when a row is added or deleted.
 *
 * Every query over-fetches one row (`pageSize + 1`): its presence is what tells
 * us whether the neighbouring page exists, so we know which way links are safe
 * to render.
 */

export const HISTORY_PAGE_SIZE = 10;

/** `older` walks towards the beginning of the user's history, `newer` back towards now. */
export type PageDirection = "older" | "newer";

export interface CursorPage<T> {
  items: T[];
  /** Cursor for the next (older) page, or null when this is the oldest page. */
  olderCursor: string | null;
  /** Cursor for the previous (newer) page, or null when this is the newest page. */
  newerCursor: string | null;
}

export interface PageParams {
  cursor?: string;
  direction: PageDirection;
}

/** Read `?cursor=` / `?dir=` off a resolved `searchParams` object. */
export function parsePageParams(searchParams: { cursor?: string; dir?: string } = {}): PageParams {
  const cursor = searchParams.cursor?.trim();
  return {
    cursor: cursor ? cursor : undefined,
    direction: searchParams.dir === "newer" ? "newer" : "older",
  };
}

/** Build a list URL for one pagination step (the plain path when unparameterized). */
export function pageHref(pathname: string, params: PageParams): string {
  const search = new URLSearchParams();
  if (params.cursor) search.set("cursor", params.cursor);
  if (params.direction === "newer") search.set("dir", "newer");
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * Slice a `pageSize + 1` over-fetch into the display window plus its neighbour
 * cursors.
 *
 * `rows` arrive in the order the query returned them — newest-first for an
 * `older` query, oldest-first for a `newer` one — and always come back
 * newest-first in `items`, so callers render one consistent order.
 *
 * The extra row is the evidence that the queried direction has another page,
 * and it always sits on the far side of the window: an `older` over-fetch ends
 * up at the oldest end (the tail), a `newer` one at the newest end (the head
 * once reversed). Either way the window is `pageSize` rows wide and
 * `hasExtra` means "there is another page that way".
 *
 * `hasCursor` is whether the request carried a cursor at all; it's how a page
 * knows there is something newer to go back to.
 */
export function buildCursorPage<T extends { id: string }>(
  rows: T[],
  pageSize: number,
  direction: PageDirection,
  hasCursor: boolean
): CursorPage<T> {
  const ordered = direction === "newer" ? [...rows].reverse() : rows;
  const hasExtra = ordered.length > pageSize;

  // A `newer` query over-fetches at the newest end, so its extra row is first
  // after reversing — keep the tail instead of the head.
  const items =
    direction === "newer"
      ? hasExtra
        ? ordered.slice(ordered.length - pageSize)
        : ordered
      : hasExtra
        ? ordered.slice(0, pageSize)
        : ordered;

  if (items.length === 0) return { items, olderCursor: null, newerCursor: null };

  const hasOlder = direction === "older" ? hasExtra : true;
  const hasNewer = direction === "newer" ? hasExtra : hasCursor;

  return {
    items,
    olderCursor: hasOlder ? items[items.length - 1].id : null,
    newerCursor: hasNewer ? items[0].id : null,
  };
}
