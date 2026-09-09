import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isPdfBuffer, looksLikePdfName, sanitizeFilename } from "../src/lib/file-check";

describe("isPdfBuffer", () => {
  it("detects a real PDF header", () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\n...");
    assert.equal(isPdfBuffer(bytes), true);
  });

  it("rejects non-PDF content even when small", () => {
    const bytes = new TextEncoder().encode("<html>not a pdf</html>");
    assert.equal(isPdfBuffer(bytes), false);
  });

  it("rejects an empty/short buffer", () => {
    assert.equal(isPdfBuffer(new Uint8Array(0)), false);
    assert.equal(isPdfBuffer(new TextEncoder().encode("%PD")), false);
  });
});

describe("looksLikePdfName", () => {
  it("matches .pdf extensions case-insensitively", () => {
    assert.equal(looksLikePdfName("resume.pdf"), true);
    assert.equal(looksLikePdfName("RESUME.PDF"), true);
    assert.equal(looksLikePdfName("resume.docx"), false);
  });
});

describe("sanitizeFilename", () => {
  it("strips directory components", () => {
    assert.equal(sanitizeFilename("../../etc/passwd.pdf"), "passwd.pdf");
    assert.equal(sanitizeFilename("C:\\Users\\me\\resume.pdf"), "resume.pdf");
  });

  it("strips control characters", () => {
    assert.equal(sanitizeFilename("resume\u0000.pdf"), "resume.pdf");
    assert.equal(sanitizeFilename("resume\u001b[31m.pdf"), "resume[31m.pdf");
  });

  it("caps length at 255 chars", () => {
    assert.ok(sanitizeFilename("x".repeat(500) + ".pdf").length <= 255);
  });

  it("handles empty/whitespace names", () => {
    assert.equal(sanitizeFilename("   "), "");
    assert.equal(sanitizeFilename(""), "");
  });
});