import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_RESUME } from "../src/lib/candidate-context";
import { isResumeDataEmpty } from "../src/lib/ai/resume-empty";

describe("isResumeDataEmpty", () => {
  it("detects an all-empty extraction", () => {
    assert.equal(isResumeDataEmpty(EMPTY_RESUME), true);
  });

  it("returns false when any bucket has content", () => {
    assert.equal(isResumeDataEmpty({ ...EMPTY_RESUME, skills: ["TypeScript"] }), false);
  });
});