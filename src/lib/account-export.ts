import { prisma } from "@/lib/db";

/** Portable JSON export of a user's practice data (no password hash). */
export async function buildAccountExport(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      termsAcceptedAt: true,
      termsPolicyVersion: true,
    },
  });

  if (!user) return null;

  const [sessions, attempts, mocks] = await Promise.all([
    prisma.interviewSession.findMany({
      where: { userId },
      include: { projects: true, questions: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.questionAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.mockInterviewSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    format: "interviewos-account-export-v1",
    user,
    interviewSessions: sessions,
    questionAttempts: attempts,
    mockInterviewSessions: mocks,
  };
}