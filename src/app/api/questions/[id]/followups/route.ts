import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const question = await prisma.interviewQuestion.findFirst({
    where: { id, session: { userId: user.id } },
    select: { followUps: true, question: true },
  });
  if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });

  const followUps = Array.isArray(question.followUps) ? (question.followUps as string[]) : [];
  return NextResponse.json({
    question: question.question,
    followUps,
  });
}
