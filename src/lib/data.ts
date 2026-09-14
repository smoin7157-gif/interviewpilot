import { prisma } from "@/lib/db";
import { listRecentMocks } from "@/lib/mock";

export const sessionInclude = {
  questions: {
    orderBy: { orderIndex: "asc" as const },
  },
} as const;

/** Shape returned by Prisma when including question id/sessionId/status. */
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
  questions: Array<{ id: string; sessionId: string; status: string }>;
};

/** Fetch one session belonging to a user (null if not found / not owned). */
export async function getOwnedSession(userId: string, sessionId: string) {
  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId },
    include: sessionInclude,
  });
  if (!session) return null;

  return {
    ...session,
    questionCount: session.questions.length,
    practicedCount: session.questions.filter((q) => q.status === "PRACTICED").length,
  };
}

/** Fetch one question that belongs to a session owned by the user. */
export async function getOwnedQuestion(userId: string, questionId: string) {
  return prisma.interviewQuestion.findFirst({
    where: { id: questionId, session: { userId } },
    include: { attempts: { orderBy: { createdAt: "desc" }, take: 5 } },
  });
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
  questions: { select: { id: true, sessionId: true, status: true } },
} as const;

/**
 * Assemble InterviewSummaries from already-fetched sessions.
 *
 * Last activity comes from ONE grouped query (latest attempt per question)
 * instead of loading every attempt row — the old implementation fetched the
 * user's entire attempt history just to read timestamps.
 */
async function buildSummaries(sessions: SessionWithQuestionStats[]): Promise<InterviewSummary[]> {
  if (sessions.length === 0) return [];

  const latestByQuestion = await prisma.questionAttempt.groupBy({
    by: ["questionId"],
    where: {
      question: { sessionId: { in: sessions.map((s) => s.id) } },
    },
    _max: { createdAt: true },
  });

  // Map questionId -> sessionId via the questions we already have in memory.
  const sessionOfQuestion = new Map<string, string>();
  for (const session of sessions) {
    for (const q of session.questions) sessionOfQuestion.set(q.id, session.id);
  }

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
    questionCount: session.questions.length,
    practicedCount: session.questions.filter((q) => q.status === "PRACTICED").length,
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
