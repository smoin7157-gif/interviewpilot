import { prisma } from "@/lib/db";
import { listRecentMocks } from "@/lib/mock";

/**
 * Shape consumed by buildSummaries: session columns plus an aggregate question
 * count (no per-question rows — keeps the list queries O(sessions)).
 */
type SessionWithQuestionStats = {
  id: string;
  role: string;
  company: string | null;
  companyType: string | null;
  interviewType: string | null;
  seniority: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  _count: { questions: number };
};

/**
 * Full workspace payload for one owned session: the session, its questions,
 * and the latest scored attempt per question (for the "last score" chip).
 */
export async function getOwnedWorkspaceSession(userId: string, sessionId: string) {
  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId },
    include: { questions: { orderBy: { orderIndex: "asc" as const } } },
  });
  if (!session) return null;

  const lastAttempts = await prisma.questionAttempt.findMany({
    where: { userId, questionId: { in: session.questions.map((q) => q.id) } },
    orderBy: { createdAt: "desc" },
    // One row per question (the latest, thanks to the desc ordering) instead
    // of the user's entire attempt history for these questions.
    distinct: ["questionId"],
    select: { questionId: true, score: true },
  });
  const lastScoreByQuestion = new Map<string, number>();
  for (const attempt of lastAttempts) {
    if (!lastScoreByQuestion.has(attempt.questionId) && attempt.score != null) {
      lastScoreByQuestion.set(attempt.questionId, attempt.score);
    }
  }

  return { session, lastScoreByQuestion };
}

export interface InterviewSummary {
  id: string;
  role: string;
  company: string | null;
  companyType: string | null;
  interviewType: string | null;
  seniority: string;
  status: string;
  questionCount: number;
  practicedCount: number;
  createdAt: Date;
  lastActivityAt: Date | null;
}

const summarySelect = {
  id: true,
  role: true,
  company: true,
  companyType: true,
  interviewType: true,
  seniority: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { questions: true } },
} as const;

/**
 * Assemble InterviewSummaries from already-fetched sessions.
 *
 * Two grouped queries replace per-question row loads regardless of how many
 * questions the sessions hold: one for practiced counts, one for the latest
 * attempt timestamp (last activity) per session.
 */
async function buildSummaries(sessions: SessionWithQuestionStats[]): Promise<InterviewSummary[]> {
  if (sessions.length === 0) return [];
  const sessionIds = sessions.map((s) => s.id);

  const [practicedBySession, latestByQuestion] = await Promise.all([
    prisma.interviewQuestion.groupBy({
      by: ["sessionId"],
      where: { sessionId: { in: sessionIds }, status: "PRACTICED" },
      _count: { _all: true },
    }),
    prisma.questionAttempt.groupBy({
      by: ["questionId"],
      where: {
        question: { sessionId: { in: sessionIds } },
      },
      _max: { createdAt: true },
    }),
  ]);

  const practicedMap = new Map<string, number>();
  for (const row of practicedBySession) {
    practicedMap.set(row.sessionId, row._count._all);
  }

  // Map questionId -> sessionId from the sessions' question counts is not
  // possible without rows, so resolve ownership with one more grouped read.
  const questionOwners = await prisma.interviewQuestion.findMany({
    where: { sessionId: { in: sessionIds }, attempts: { some: {} } },
    select: { id: true, sessionId: true },
  });
  const sessionOfQuestion = new Map<string, string>();
  for (const q of questionOwners) sessionOfQuestion.set(q.id, q.sessionId);

  const lastActivityBySession = new Map<string, Date>();
  for (const row of latestByQuestion) {
    if (row._max.createdAt == null) continue;
    const sessionId = sessionOfQuestion.get(row.questionId);
    if (!sessionId) continue;
    const existing = lastActivityBySession.get(sessionId);
    if (!existing || row._max.createdAt > existing) {
      lastActivityBySession.set(sessionId, row._max.createdAt);
    }
  }

  return sessions.map((session) => ({
    id: session.id,
    role: session.role,
    company: session.company,
    companyType: session.companyType,
    interviewType: session.interviewType,
    seniority: session.seniority,
    status: session.status,
    questionCount: session._count.questions,
    practicedCount: practicedMap.get(session.id) ?? 0,
    createdAt: session.createdAt,
    lastActivityAt: lastActivityBySession.get(session.id) ?? null,
  }));
}

/** List a user's interview sessions with question/practice stats, newest first. */
export async function listSessionsForUser(userId: string): Promise<InterviewSummary[]> {
  const sessions = await prisma.interviewSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: summarySelect,
  });
  return buildSummaries(sessions);
}

/** Dashboard greeting data: recent sessions (latest first) capped at `limit`. */
export async function getRecentSessions(userId: string, limit = 3): Promise<InterviewSummary[]> {
  const sessions = await prisma.interviewSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: summarySelect,
  });
  return buildSummaries(sessions);
}

/** Recent mock sessions for the dashboard strip (Phase 4), newest first. */
export async function getRecentMocks(userId: string, limit = 3) {
  return listRecentMocks(userId, limit);
}

/**
 * Questions this user has already had generated across all their sessions,
 * newest first. Passed to generation as an avoid-list so repeat sessions
 * surface fresh questions instead of near-identical rephrases.
 */
export async function listGeneratedQuestions(userId: string, limit = 200): Promise<string[]> {
  const rows = await prisma.interviewQuestion.findMany({
    where: { session: { userId } },
    orderBy: { createdAt: "desc" },
    select: { question: true },
    take: limit,
  });
  return rows.map((r) => r.question);
}
