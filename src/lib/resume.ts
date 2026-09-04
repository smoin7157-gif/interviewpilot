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
      let lastY: number | undefined;
      let pageText = "";
      for (const item of content.items) {
        const y = item.transform?.[5];
        if (lastY === undefined || y === undefined || Math.abs(y - lastY) < 2) {
          pageText += item.str ?? "";
        } else {
          pageText += `\n${item.str ?? ""}`;
        }
        if (y !== undefined) lastY = y;
      }
      pages.push(pageText);
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
    console.error("[resume] pdf parse failed:", err instanceof Error ? `${err.name}: ${err.message}` : String(err));
    throw new Error("We couldn't read that PDF. It may be scanned, encrypted, or corrupted.");
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