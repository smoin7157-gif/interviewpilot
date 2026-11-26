import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { faqEntryId } from "../src/lib/faq-slug";

describe("faqEntryId", () => {
  it("slugifies a question for hash links", () => {
    assert.equal(
      faqEntryId("Which browser should I use for voice practice?"),
      "which-browser-should-i-use-for-voice-practice"
    );
  });
});