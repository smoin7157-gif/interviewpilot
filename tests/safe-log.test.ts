import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeAiLogMessage } from "../src/lib/ai/safe-log";

describe("sanitizeAiLogMessage", () => {
  it("truncates long provider errors", () => {
    const long = "x".repeat(500);
    assert.equal(sanitizeAiLogMessage(long).length, 241);
    assert.match(sanitizeAiLogMessage(long), /…$/);
  });

  it("collapses newlines", () => {
    assert.equal(sanitizeAiLogMessage("line1\nline2"), "line1 line2");
  });
});