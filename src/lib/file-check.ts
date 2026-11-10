/**
 * Small, testable file-safety helpers used by upload routes.
 * Kept dependency-free so they can be unit-tested in isolation.
 */

const PDF_MAGIC = "%PDF-";
// Every ZIP-based container (including .docx) starts with the local-file-header
// signature; the extension alone is not trusted.
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

/** True when the buffer starts with the PDF magic bytes (`%PDF-`). */
export function isPdfBuffer(buffer: Uint8Array): boolean {
  if (buffer.length < PDF_MAGIC.length) return false;
  for (let i = 0; i < PDF_MAGIC.length; i++) {
    if (buffer[i] !== PDF_MAGIC.charCodeAt(i)) return false;
  }
  return true;
}

/** True when the buffer starts with the ZIP local-file-header magic bytes. */
export function isZipBuffer(buffer: Uint8Array): boolean {
  if (buffer.length < ZIP_MAGIC.length) return false;
  for (let i = 0; i < ZIP_MAGIC.length; i++) {
    if (buffer[i] !== ZIP_MAGIC[i]) return false;
  }
  return true;
}

/**
 * Reduce a user-supplied filename to a safe display name: strips directory
 * components (and any Windows path separators) and control characters so a
 * stored filename can never be mistaken for a path or inject terminal escape
 * sequences when rendered.
 */
export function sanitizeFilename(name: string): string {
  const basename = name.split(/[\\/]/).pop() ?? "";
  return basename
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 255);
}

/** True when the name looks like a PDF (extension or MIME hint). */
export function looksLikePdfName(name: string): boolean {
  return /\.pdf$/i.test(name);
}

/** True when the name looks like a Word document (.docx). */
export function looksLikeDocxName(name: string): boolean {
  return /\.docx$/i.test(name);
}