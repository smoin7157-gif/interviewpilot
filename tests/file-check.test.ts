import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isPdfBuffer,
  isZipBuffer,
  looksLikeDocxName,
  looksLikePdfName,
  sanitizeFilename,
} from "../src/lib/file-check";

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

describe("isZipBuffer", () => {
  it("detects the ZIP local-file header used by .docx", () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
    assert.equal(isZipBuffer(bytes), true);
  });

  it("rejects PDFs, HTML and short buffers", () => {
    assert.equal(isZipBuffer(new TextEncoder().encode("%PDF-1.7")), false);
    assert.equal(isZipBuffer(new TextEncoder().encode("PK")), false);
    assert.equal(isZipBuffer(new Uint8Array(0)), false);
  });
});

describe("looksLikeDocxName", () => {
  it("matches .docx extensions case-insensitively only", () => {
    assert.equal(looksLikeDocxName("resume.docx"), true);
    assert.equal(looksLikeDocxName("RESUME.DOCX"), true);
    assert.equal(looksLikeDocxName("resume.pdf"), false);
    assert.equal(looksLikeDocxName("resume.doc"), false);
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