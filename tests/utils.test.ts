import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cn, countWords, estimateSpeakingSeconds, formatClock, initials, pluralize } from "../src/lib/utils";

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

describe("countWords", () => {
  it("counts whitespace-delimited words", () => {
    assert.equal(countWords("one two three"), 3);
  });

  it("ignores surrounding and repeated whitespace", () => {
    assert.equal(countWords("  spaced   out  "), 2);
    assert.equal(countWords("line\nbreak\ttab"), 3);
  });

  it("returns 0 for empty input", () => {
    assert.equal(countWords(""), 0);
    assert.equal(countWords("   "), 0);
  });
});

describe("formatClock", () => {
  it("formats seconds as m:ss", () => {
    assert.equal(formatClock(0), "0:00");
    assert.equal(formatClock(9), "0:09");
    assert.equal(formatClock(66), "1:06");
    assert.equal(formatClock(600), "10:00");
  });

  it("clamps negatives and floors fractions", () => {
    assert.equal(formatClock(-5), "0:00");
    assert.equal(formatClock(59.9), "0:59");
  });
});

describe("estimateSpeakingSeconds", () => {
  it("returns 0 for an empty answer", () => {
    assert.equal(estimateSpeakingSeconds(""), 0);
  });

  it("grows with the word count", () => {
    const short = estimateSpeakingSeconds(Array(40).fill("word").join(" "));
    const long = estimateSpeakingSeconds(Array(160).fill("word").join(" "));
    assert.ok(short >= 5);
    assert.ok(long > short);
  });
});