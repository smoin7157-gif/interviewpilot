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
    include: { questions: true },
  });
  if (!session) return NextResponse.json({ error: "Interview not found." }, { status: 404 });

  return NextResponse.json({
    ...session,
    questionCount: session.questions.length,
    practicedCount: session.questions.filter((q) => q.status === "PRACTICED").length,
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const session = await prisma.interviewSession.findFirst({ where: { id, userId: user.id } });
  if (!session) return NextResponse.json({ error: "Interview not found." }, { status: 404 });

  await prisma.interviewSession.delete({ where: { id: session.id } });
  return NextResponse.json({ ok: true });
}
