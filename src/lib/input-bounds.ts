import { normalizeStableText } from "@/lib/ai/stable-input-cache";

/** Below this length, resume extraction skips the live model and uses the heuristic only. */
export const MIN_RESUME_TEXT_CHARS = 40;

/** Reject uploads whose extracted plain text is unusable before any AI call. */
export const MIN_RESUME_UPLOAD_CHARS = 20;

export function hasMinimumExtractableText(text: string): boolean {
  return normalizeStableText(text).length >= MIN_RESUME_TEXT_CHARS;
}

export function isResumeUploadTextUsable(text: string): boolean {
  return normalizeStableText(text).length >= MIN_RESUME_UPLOAD_CHARS;
}