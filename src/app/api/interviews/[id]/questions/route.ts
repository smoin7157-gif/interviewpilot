import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const session = await prisma.interviewSession.findFirst({
    where: { id, userId: user.id },
    include: {
      questions: {
        orderBy: { orderIndex: "asc" },
        include: {
          attempts: { orderBy: { createdAt: "desc" }, take: 1, select: { score: true, createdAt: true } },
        },
      },
    },
  });
  if (!session) return NextResponse.json({ error: "Interview not found." }, { status: 404 });

  return NextResponse.json({
    session: {
      id: session.id,
      role: session.role,
      seniority: session.seniority,
      company: session.company,
      companyType: session.companyType,
      interviewType: session.interviewType,
      jobDescription: session.jobDescription,
      status: session.status,
    },
    questions: session.questions.map((q) => ({
      id: q.id,
      question: q.question,
      category: q.category,
      difficulty: q.difficulty,
      reason: q.reason,
      suggestedAnswer: q.suggestedAnswer,
      followUps: q.followUps as string[],
      orderIndex: q.orderIndex,
      status: q.status,
      lastScore: q.attempts[0]?.score ?? null,
    })),
  });
}
