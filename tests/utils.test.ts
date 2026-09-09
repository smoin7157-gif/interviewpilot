import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cn, initials, pluralize } from "../src/lib/utils";

describe("cn", () => {
  it("joins truthy classes and drops falsy ones", () => {
    assert.equal(cn("a", "b", false, null, undefined, ""), "a b");
  });
});

describe("initials", () => {
  it("produces initials from a full name", () => {
    assert.equal(initials("Ada Lovelace"), "AL");
  });

  it("handles single names", () => {
    assert.equal(initials("ada"), "A");
  });

  it("handles empty input", () => {
    assert.equal(initials(""), "");
  });
});

describe("pluralize", () => {
  it("uses the singular for 1", () => {
    assert.equal(pluralize(1, "question"), "question");
  });

  it("uses the plural otherwise", () => {
    assert.equal(pluralize(2, "question"), "questions");
    assert.equal(pluralize(0, "question"), "questions");
  });

  it("accepts a custom plural", () => {
    assert.equal(pluralize(2, "category", "categories"), "categories");
  });
});