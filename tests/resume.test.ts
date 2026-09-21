import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderPageText } from "../src/lib/resume";

/**
 * Resume text-extraction edge cases.
 *
 * renderPageText is the pdf.js → text bridge: it must (1) keep normal single
 * column lines intact, (2) split multi-column gutters into separate lines
 * instead of jamming unrelated sections together, and (3) skip marked-content
 * entries that carry no text.
 *
 * Scanned/image-only PDFs and password-protected PDFs cannot be synthesized
 * here without fixture files — those cases are covered by the MIN_TEXT_CHARS
 * gate (scanned → "may be a scanned image" error) and the PasswordException
 * mapping (encrypted → "remove the password" error) in extractPdfText.
 */

// Mirrors pdf.js TextItem shape: [a, b, c, d, e, f] transform where
// (e, f) is the (x, y) position and width/height are measured in pt.
function textItem(str: string, x: number, y: number, width: number, height = 12) {
  return { str, transform: [1, 0, 0, 1, x, y], width, height };
}

function markedContent() {
  // pdf.js emits these between text items; they have no str at all.
  return { type: "beginMarkedContent", id: "mc0" };
}

describe("renderPageText (pdf.js text items → lines)", () => {
  it("keeps a single-column line intact", () => {
    const text = renderPageText({
      items: [textItem("Software Engineer", 72, 700, 100), textItem(" with 3 years experience", 173, 700, 150)],
    });
    assert.equal(text, "Software Engineer with 3 years experience");
  });

  it("breaks separate baselines into separate lines", () => {
    const text = renderPageText({
      items: [
        textItem("SKILLS", 72, 700, 50),
        textItem("TypeScript, React", 72, 684, 100),
        textItem("EXPERIENCE", 72, 660, 70),
      ],
    });
    assert.equal(text, "SKILLS\nTypeScript, React\nEXPERIENCE");
  });

  it("splits a multi-column gutter into separate lines instead of jamming", () => {
    // Left column at x=72, right column at x=320 — a ~120pt gutter between
    // the end of the left text and the start of the right column.
    const text = renderPageText({
      items: [
        textItem("SKILLS", 72, 700, 50),
        textItem("TypeScript, React, SQL", 320, 700, 130),
        textItem("Built APIs for 5k customers", 72, 684, 160),
        textItem("EXPERIENCE", 320, 684, 80),
      ],
    });
    const lines = text.split("\n");
    assert.ok(lines.includes("SKILLS"), `expected SKILLS on its own line, got: ${text}`);
    assert.ok(lines.includes("TypeScript, React, SQL"), `expected right column on its own line, got: ${text}`);
    assert.ok(lines.includes("Built APIs for 5k customers"), `expected left column line intact, got: ${text}`);
    assert.ok(lines.includes("EXPERIENCE"), `expected EXPERIENCE on its own line, got: ${text}`);
    // The old renderer would have produced "SKILLSTypeScript, React, SQL".
    assert.ok(!text.includes("SKILLSTypeScript"), `columns must not be jammed, got: ${text}`);
  });

  it("does not split normal word gaps inside a sentence", () => {
    const text = renderPageText({
      items: [textItem("Designed", 72, 700, 50), textItem("and", 140, 700, 20), textItem("shipped", 180, 700, 45)],
    });
    assert.equal(text, "Designed and shipped");
  });

  it("skips marked-content entries without text", () => {
    const text = renderPageText({
      items: [markedContent(), textItem("Hello", 72, 700, 40), markedContent()],
    });
    assert.equal(text, "Hello");
  });

  it("drops whitespace-only items and empty rows", () => {
    const text = renderPageText({
      items: [textItem("   ", 72, 700, 30), textItem("Real content", 72, 684, 80)],
    });
    assert.equal(text, "Real content");
  });
});
