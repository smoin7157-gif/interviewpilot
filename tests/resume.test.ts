import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractDocxText, renderPageText } from "../src/lib/resume";

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

/* --------------------------- DOCX extraction fixtures --------------------------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (const byte of data) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Build a minimal, valid ZIP container (stored entries) so the DOCX tests can
 * exercise the real mammoth path without a binary fixture in the repo.
 */
function buildZip(entries: Array<{ name: string; data: Buffer }>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const data = entry.data;
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt16LE(0, 10); // mod time
    local.writeUInt16LE(0x21, 12); // mod date (1980-01-01)
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0, 8); // flags
    central.writeUInt16LE(0, 10); // stored
    central.writeUInt16LE(0, 12); // mod time
    central.writeUInt16LE(0x21, 14); // mod date
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30); // extra
    central.writeUInt16LE(0, 32); // comment
    central.writeUInt16LE(0, 34); // disk
    central.writeUInt16LE(0, 36); // internal attrs
    central.writeUInt32LE(0, 38); // external attrs
    central.writeUInt32LE(offset, 42);

    locals.push(local, name, data);
    centrals.push(central, name);
    offset += local.length + name.length + data.length;
  }

  const centralDir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, centralDir, end]);
}

function docxWithParagraphs(paragraphs: string[]): Buffer {
  const body = paragraphs.map((text) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`).join("");
  const xml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:body>${body}</w:body></w:document>`;
  return buildZip([{ name: "word/document.xml", data: Buffer.from(xml, "utf8") }]);
}

describe("extractDocxText", () => {
  it("reads paragraph text out of a real .docx container", async () => {
    const text = await extractDocxText(
      docxWithParagraphs([
        "Jane Doe",
        "Software Engineer with three years of experience building web applications.",
        "Skills",
        "TypeScript, React, PostgreSQL, Node.js, Docker",
        "Experience",
        "Built and shipped customer-facing APIs used by thousands of users.",
      ])
    );
    assert.match(text, /Jane Doe/);
    assert.match(text, /TypeScript, React, PostgreSQL/);
    assert.match(text, /Built and shipped customer-facing APIs/);
  });

  it("rejects content that is not a readable .docx", async () => {
    await assert.rejects(
      () => extractDocxText(Buffer.from("this is not a zip container")),
      /Word document/
    );
  });

  it("reports an image-only document instead of returning empty text", async () => {
    await assert.rejects(() => extractDocxText(docxWithParagraphs([""])), /enough text/);
  });
});

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
