/**
 * Written-practice attempt history.
 *
 * `question_attempts` is append-only and the workspace only needs the newest
 * few per question. The database query is bounded (the latest rows for the
 * session), and this grouping keeps that read small and in order. Pure so the
 * rule is unit-testable without a database.
 */

export const ATTEMPTS_PER_QUESTION = 5;

/**
 * Group attempt rows (expected newest-first) by question, keeping at most
 * `perQuestion` each. First-seen order is preserved, so the newest attempt
 * stays first within every question.
 */
export function groupAttemptsByQuestion<T extends { questionId: string }>(
  rows: T[],
  perQuestion = ATTEMPTS_PER_QUESTION
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const existing = grouped.get(row.questionId);
    if (!existing) {
      grouped.set(row.questionId, [row]);
    } else if (existing.length < perQuestion) {
      existing.push(row);
    }
  }
  return grouped;
}
