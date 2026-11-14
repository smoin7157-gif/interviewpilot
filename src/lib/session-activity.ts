/**
 * Pure helpers for "last activity" timestamps on interview session lists.
 * Extracted so list aggregation stays testable without a database.
 */

export type LatestAttemptByQuestion = {
  questionId: string;
  latestAt: Date | null;
};

/** Map each session to the newest attempt timestamp among its questions. */
export function computeLastActivityBySession(
  latestByQuestion: ReadonlyArray<LatestAttemptByQuestion>,
  sessionOfQuestion: ReadonlyMap<string, string>
): Map<string, Date> {
  const lastActivityBySession = new Map<string, Date>();
  for (const row of latestByQuestion) {
    if (row.latestAt == null) continue;
    const sessionId = sessionOfQuestion.get(row.questionId);
    if (!sessionId) continue;
    const existing = lastActivityBySession.get(sessionId);
    if (!existing || row.latestAt > existing) {
      lastActivityBySession.set(sessionId, row.latestAt);
    }
  }
  return lastActivityBySession;
}