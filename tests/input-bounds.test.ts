import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hasMinimumExtractableText,
  isResumeUploadTextUsable,
  MIN_RESUME_TEXT_CHARS,
  MIN_RESUME_UPLOAD_CHARS,
} from "../src/lib/input-bounds";

describe("input-bounds", () => {
  it("defines minimum resume thresholds", () => {
    assert.ok(MIN_RESUME_UPLOAD_CHARS < MIN_RESUME_TEXT_CHARS);
  });

  it("rejects near-empty resume text before AI extraction", () => {
    assert.equal(isResumeUploadTextUsable("   "), false);
    assert.equal(isResumeUploadTextUsable("Jane Doe"), false);
    assert.equal(isResumeUploadTextUsable("Jane Doe\nSkills: TypeScript, Node.js\nExperience at Acme"), true);
  });

  it("skips live model for very short sanitized text", () => {
    assert.equal(hasMinimumExtractableText("short"), false);
    assert.equal(
      hasMinimumExtractableText("Jane Doe built APIs with TypeScript and Node.js at Acme Corp."),
      true
    );
  });
});