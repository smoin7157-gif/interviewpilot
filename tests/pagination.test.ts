import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildCursorPage,
  pageHref,
  parsePageParams,
  parseSearchQuery,
  parseStatusFilter,
} from "../src/lib/pagination";

/** Rows as the data layer returns them, newest-first. */
const rows = (...ids: string[]) => ids.map((id) => ({ id }));

// The fixtures below use one universe throughout: sessions newest-first are
// e, d, c, b, a, shown two per page → [e d] [c b] [a].
describe("buildCursorPage — older direction", () => {
  it("exposes an older cursor when the query over-fetched", () => {
    // page one: e, d and the extra c that proves [c b] exists
    const page = buildCursorPage(rows("e", "d", "c"), 2, "older", false);
    assert.deepEqual(
      page.items.map((r) => r.id),
      ["e", "d"]
    );
    assert.equal(page.olderCursor, "d");
    assert.equal(page.newerCursor, null);
  });

  it("links back to the newer page when a cursor was supplied", () => {
    // page two, reached from page one: the extra a proves [a] exists
    const page = buildCursorPage(rows("c", "b", "a"), 2, "older", true);
    assert.deepEqual(
      page.items.map((r) => r.id),
      ["c", "b"]
    );
    assert.equal(page.olderCursor, "b");
    assert.equal(page.newerCursor, "c");
  });

  it("has no older cursor on the last page", () => {
    const page = buildCursorPage(rows("a"), 2, "older", true);
    assert.deepEqual(
      page.items.map((r) => r.id),
      ["a"]
    );
    assert.equal(page.olderCursor, null);
    // we arrived here from a newer page, so we can go back to it
    assert.equal(page.newerCursor, "a");
  });

  it("is empty when the cursor no longer resolves", () => {
    const page = buildCursorPage([], 2, "older", true);
    assert.deepEqual(page.items, []);
    assert.equal(page.olderCursor, null);
    assert.equal(page.newerCursor, null);
  });
});

describe("buildCursorPage — newer direction", () => {
  // A `newer` query walks strictly-newer rows in ascending order, so its rows
  // arrive oldest-first and the over-fetch lands at the newest end.
  it("reverses an ascending over-fetch and keeps the newest pageSize rows", () => {
    // universe newest-first: h g f e d c b a, pages of two: [h g] [f e] [d c] [b a].
    // Leaving [d c] for the newer page: this query returns e, f and g, and the
    // extra row (g) is what proves [h g] sits above.
    const page = buildCursorPage(rows("e", "f", "g"), 2, "newer", true);
    assert.deepEqual(
      page.items.map((r) => r.id),
      ["f", "e"]
    );
    assert.equal(page.newerCursor, "f");
    assert.equal(page.olderCursor, "e");
  });

  it("has no newer cursor once the newest sessions are on screen", () => {
    // the same step at the top of the list: only g and h are newer than the
    // boundary, so there is nothing above to link to
    const page = buildCursorPage(rows("g", "h"), 2, "newer", true);
    assert.deepEqual(
      page.items.map((r) => r.id),
      ["h", "g"]
    );
    assert.equal(page.newerCursor, null);
    assert.equal(page.olderCursor, "g");
  });
});

describe("parsePageParams", () => {
  it("defaults to the newest page", () => {
    assert.deepEqual(parsePageParams({}), { cursor: undefined, direction: "older" });
  });

  it("reads a cursor and direction", () => {
    assert.deepEqual(parsePageParams({ cursor: "abc", dir: "newer" }), {
      cursor: "abc",
      direction: "newer",
    });
  });

  it("ignores a blank cursor and an unknown direction", () => {
    assert.deepEqual(parsePageParams({ cursor: "   ", dir: "sideways" }), {
      cursor: undefined,
      direction: "older",
    });
  });
});

describe("pageHref", () => {
  it("returns the bare path for the newest page", () => {
    assert.equal(pageHref("/history", { direction: "older" }), "/history");
  });

  it("encodes the cursor and only adds dir when going newer", () => {
    assert.equal(
      pageHref("/history", { cursor: "clx1", direction: "older" }),
      "/history?cursor=clx1"
    );
    assert.equal(
      pageHref("/history", { cursor: "clx1", direction: "newer" }),
      "/history?cursor=clx1&dir=newer"
    );
  });

  it("carries active filters across a page step", () => {
    assert.equal(
      pageHref("/interviews", { cursor: "clx1", direction: "older" }, { q: "backend", status: "ready" }),
      "/interviews?cursor=clx1&q=backend&status=ready"
    );
  });

  it("omits filters that are not set", () => {
    assert.equal(
      pageHref("/interviews", { direction: "older" }, { q: "", status: undefined }),
      "/interviews"
    );
  });
});

describe("parseSearchQuery", () => {
  it("defaults to empty and trims whitespace", () => {
    assert.equal(parseSearchQuery({}), "");
    assert.equal(parseSearchQuery({ q: "  backend  " }), "backend");
  });

  it("caps a runaway paste so it can't become an unbounded search", () => {
    const long = "x".repeat(200);
    assert.equal(parseSearchQuery({ q: long }).length, 80);
  });
});

describe("parseStatusFilter", () => {
  const allowed = ["all", "ready", "draft"] as const;

  it("keeps a known value", () => {
    assert.equal(parseStatusFilter({ status: "draft" }, allowed), "draft");
  });

  it("falls back to all for a missing or unknown value", () => {
    assert.equal(parseStatusFilter({}, allowed), "all");
    assert.equal(parseStatusFilter({ status: "nonsense" }, allowed), "all");
  });
});
