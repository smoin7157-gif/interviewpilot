import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createInterviewSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = createInterviewSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid input.";
    return NextResponse.json({ error: first }, { status: 422 });
  }

  const { role, seniority, company, companyType, interviewType, jobDescription, questionCount } = parsed.data;

  const session = await prisma.interviewSession.create({
    data: {
      userId: user.id,
      role,
      seniority,
      company: company || null,
      companyType: companyType || null,
      interviewType: interviewType || null,
      jobDescription: jobDescription || null,
      questionCountTarget: questionCount,
      status: "DRAFT",
    },
    select: {
      id: true,
      role: true,
      seniority: true,
      company: true,
      companyType: true,
      interviewType: true,
      status: true,
    },
  });

  return NextResponse.json(session, { status: 201 });
}

export async function GET() {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await prisma.interviewSession.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      questions: { select: { status: true } },
    },
  });

  return NextResponse.json({
    interviews: sessions.map((session) => ({
      id: session.id,
      role: session.role,
      seniority: session.seniority,
      company: session.company,
      companyType: session.companyType,
      interviewType: session.interviewType,
      status: session.status,
      questionCount: session.questions.length,
      practicedCount: session.questions.filter((q) => q.status === "PRACTICED").length,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    })),
  });
}
