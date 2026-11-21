/**
 * Canonical ownership filters for API queries. Every authenticated route that
 * reads or mutates interview data should use one of these shapes so a caller
 * cannot access another user's rows by id guessing.
 */
export function interviewSessionOwnedWhere(sessionId: string, userId: string) {
  return { id: sessionId, userId } as const;
}

export function questionOwnedWhere(questionId: string, userId: string) {
  return { id: questionId, session: { userId } } as const;
}

export function mockSessionOwnedWhere(mockId: string, userId: string) {
  return { id: mockId, userId } as const;
}