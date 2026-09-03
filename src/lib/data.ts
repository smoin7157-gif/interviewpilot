import { prisma } from "@/lib/db";

export const sessionInclude = {
  questions: {
    orderBy: { orderIndex: "asc" as const },
  },
} as const;

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
  seniority: string;
  status: string;
  questionCount: number;
  practicedCount: number;
  createdAt: Date;
  lastActivityAt: Date | null;
}

/** List a user's interview sessions with question/practice stats, newest first. */
export async function listSessionsForUser(userId: string): Promise<InterviewSummary[]> {
  const sessions = await prisma.interviewSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { questions: { select: { status: true } } },
  });

  const lastAttempts = await prisma.questionAttempt.findMany({
    where: { userId, question: { session: { userId } } },
    select: { question: { select: { sessionId: true } }, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const lastActivityBySession = new Map<string, Date>();
  for (const attempt of lastAttempts) {
    const key = attempt.question.sessionId;
    if (!lastActivityBySession.has(key)) lastActivityBySession.set(key, attempt.createdAt);
  }

  return sessions.map((session) => ({
    id: session.id,
    role: session.role,
    company: session.company,
    seniority: session.seniority,
    status: session.status,
    questionCount: session.questions.length,
    practicedCount: session.questions.filter((q) => q.status === "PRACTICED").length,
    createdAt: session.createdAt,
    lastActivityAt: lastActivityBySession.get(session.id) ?? null,
  }));
}

/** Dashboard greeting data: recent sessions (latest first) capped at `limit`. */
export async function getRecentSessions(userId: string, limit = 3) {
  const sessions = await listSessionsForUser(userId);
  return sessions.slice(0, limit);
}
