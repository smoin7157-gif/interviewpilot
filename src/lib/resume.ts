import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

// Point pdf.js at the real worker file on disk (anchored at the project root)
// so the worker dynamic import resolves even when the package is bundled.
try {
  const require = createRequire(join(process.cwd(), "resume-loader.cjs"));
  GlobalWorkerOptions.workerSrc = pathToFileURL(
    require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")
  ).href;
} catch {
  // Non-bundled environments resolve the worker themselves.
}

const MAX_TEXT_CHARS = 20_000;
const MIN_TEXT_CHARS = 60;

interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Median of the given numbers (0 when empty). */
function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Renders one page's text items as lines. Exported for tests.
 *
 * Items are grouped into visual rows by baseline (top→bottom), then each row
 * is read left→right. A horizontal gap larger than a word space is treated as
 * a column/table gutter and breaks the line — without this, multi-column
 * resumes jam unrelated sections onto shared lines ("SkillsToolchain" /
 * "ExperienceSkills" garbage) and downstream extraction produces noise.
 */
export function renderPageText(content: { items: unknown[] }): string {
  const items: PdfTextItem[] = [];
  for (const raw of content.items) {
    // Skip marked-content entries; only TextItems carry str/transform.
    if (typeof raw !== "object" || raw === null || !("str" in raw)) continue;
    const item = raw as {
      str?: unknown;
      transform?: unknown;
      width?: unknown;
      height?: unknown;
    };
    if (typeof item.str !== "string" || item.str.length === 0) continue;
    const t = Array.isArray(item.transform) ? (item.transform as number[]) : undefined;
    items.push({
      str: item.str,
      x: typeof t?.[4] === "number" ? t[4] : 0,
      y: typeof t?.[5] === "number" ? t[5] : 0,
      width: typeof item.width === "number" ? item.width : 0,
      height: typeof item.height === "number" ? item.height : (typeof t?.[3] === "number" ? Math.abs(t[3]) : 0),
    });
  }
  if (items.length === 0) return "";

  // Group into rows: same visual line when baselines are within tolerance.
  const Y_TOLERANCE = 2;
  const rows: PdfTextItem[][] = [];
  for (const item of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(row[0].y - item.y) < Y_TOLERANCE) {
      row.push(item);
    } else {
      rows.push([item]);
    }
  }

  // A gap wider than this is a gutter, not a word space. Scaled by the page's
  // median text size (falling back to 12pt body text) with a floor so tiny
  // fonts don't split normal sentences.
  const fontSize = median(items.map((i) => i.height).filter((h) => h > 0));
  const GUTTER_MIN_PT = 14;
  const gutter = Math.max(GUTTER_MIN_PT, (fontSize || 12) * 1.8);

  const lines: string[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    let line = "";
    let prevEnd: number | null = null;
    for (const item of row) {
      if (prevEnd !== null) {
        const gap = item.x - prevEnd;
        if (gap >= gutter) {
          // Column gutter: start a new line instead of jamming text together.
          line += "\n";
        } else if (
          gap > 1 &&
          !/\s$/.test(line) &&
          !/^\s/.test(item.str)
        ) {
          line += " ";
        }
      }
      line += item.str;
      prevEnd = item.x + item.width;
    }
    const trimmed = line.trim();
    if (trimmed.length > 0) lines.push(trimmed);
  }
  return lines.join("\n");
}

function describePdfError(err: unknown): string {
  const name = err instanceof Error ? err.name : "";
  // pdf.js signals encrypted/password-protected files with PasswordException
  // (name survives even when the message doesn't).
  if (name === "PasswordException" || (err instanceof Error && /password/i.test(err.message))) {
    return "That PDF is password-protected. Remove the password from the file and upload it again.";
  }
  if (name === "InvalidPDFException") {
    return "That file isn't a readable PDF. It may be corrupted — try re-exporting it from your editor.";
  }
  return "We couldn't read that PDF. It may be scanned, encrypted, or corrupted.";
}

/** Extracts raw text from a PDF buffer. Throws a friendly error when unreadable. */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  let text = "";
  try {
    // Copy into a fresh Uint8Array so pdf.js owns its memory.
    const data = new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
    const task = getDocument({
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true,
      verbosity: 0,
    });
    const doc = await task.promise;
    const pages: string[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      pages.push(renderPageText(content));
      try {
        page.cleanup();
      } catch {
        // best-effort
      }
    }
    try {
      await task.destroy();
    } catch {
      // best-effort cleanup
    }
    text = pages.join("\n\n");
  } catch (err) {
    console.error(
      "[resume] pdf parse failed:",
      err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    );
    throw new Error(describePdfError(err));
  }

  const cleaned = sanitizeResumeText(text);
  if (cleaned.length < MIN_TEXT_CHARS) {
    throw new Error(
      "We couldn't extract enough text from that PDF. It may be a scanned image — try a text-based PDF or another file."
    );
  }
  return cleaned;
}

/** Collapses whitespace and caps length so we never blast a whole resume at the model. */
export function sanitizeResumeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}
