import type { WorkspaceQuestion } from "@/lib/types";

/**
 * Where the practice workspace should open.
 *
 * The workspace used to keep its position only in React state, so a refresh, a
 * bookmark, or coming back from the spoken mock always dropped the user at the
 * first unpracticed question — losing the question they were reading. The
 * position is now part of the URL (`?q=<questionId>&f=<followUpIndex>`), and
 * this module is the single, testable rule for reading it and writing it back.
 */

export type PracticeTab = "interview" | "followup";

export interface PracticePosition {
  /** Index into the question list, or -1 when there are no questions. */
  mainIdx: number;
  /** Index into the selected question's follow-ups (0 when not on one). */
  followUpIdx: number;
  tab: PracticeTab;
}

type PositionQuestion = Pick<WorkspaceQuestion, "id" | "status" | "followUps">;

/**
 * Resolve a URL position against the questions that actually exist.
 *
 * Degrades safely: an unknown/removed question id, a follow-up index that the
 * question no longer has, or a malformed value all fall back to the question's
 * main view — never to a blank pane. With no position requested, the first
 * unpracticed question wins, which is the same "pick up where you left off"
 * rule the workspace has always used.
 */
export function resolvePracticePosition(
  questions: PositionQuestion[],
  query: { q?: string; f?: string } = {}
): PracticePosition {
  if (questions.length === 0) return { mainIdx: -1, followUpIdx: 0, tab: "interview" };

  const requestedIdx = query.q ? questions.findIndex((question) => question.id === query.q) : -1;
  const firstUnfinished = questions.findIndex((question) => question.status !== "PRACTICED");
  const mainIdx = requestedIdx >= 0 ? requestedIdx : firstUnfinished === -1 ? 0 : firstUnfinished;

  // A follow-up position is only meaningful alongside the question it belongs
  // to, so it is ignored when the URL names no (or an unknown) question.
  if (requestedIdx >= 0 && query.f != null) {
    const followUpIdx = Number.parseInt(query.f, 10);
    const followUpCount = questions[mainIdx].followUps?.length ?? 0;
    if (Number.isInteger(followUpIdx) && followUpIdx >= 0 && followUpIdx < followUpCount) {
      return { mainIdx, followUpIdx, tab: "followup" };
    }
  }

  return { mainIdx, followUpIdx: 0, tab: "interview" };
}

/**
 * The search string for a practice position (`"?"`-prefixed, or `""` at rest).
 *
 * Follow-ups keep both the question and their index so a shared link lands on
 * the exact prompt; the main question needs only its id.
 */
export function practiceSearch(questionId: string | undefined, followUpIndex?: number): string {
  if (!questionId) return "";
  const params = new URLSearchParams({ q: questionId });
  if (followUpIndex != null && Number.isInteger(followUpIndex) && followUpIndex >= 0) {
    params.set("f", String(followUpIndex));
  }
  return `?${params.toString()}`;
}

/** The workspace path for a position — used for links into practice. */
export function practiceHref(
  sessionId: string,
  questionId?: string,
  followUpIndex?: number
): string {
  return `/interviews/${sessionId}${practiceSearch(questionId, followUpIndex)}`;
}
