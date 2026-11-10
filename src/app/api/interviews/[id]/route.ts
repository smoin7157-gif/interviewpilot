import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit, rateLimitError } from "@/lib/rate-limit";
import { updateInterviewSchema } from "@/lib/validation";

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

/**
 * Edit a draft interview's setup.
 *
 * Only sessions without generated questions are editable: the question set is
 * grounded in the setup it was generated from, so silently changing the role or
 * job description afterward would leave the stored questions answering a
 * different interview. Once questions exist the honest path is a new session.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Setup edits are small and rare; the limit only stops a script from
  // rewriting the same draft in a loop.
  const rl = checkRateLimit(`interview-edit:${user.id}`, { limit: 60, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) return rateLimitError(rl.retryAfterSeconds);

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = updateInterviewSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid input.";
    return NextResponse.json({ error: first }, { status: 422 });
  }
  const input = parsed.data;

  const session = await prisma.interviewSession.findFirst({
    where: { id, userId: user.id },
    select: { id: true, _count: { select: { questions: true } } },
  });
  if (!session) return NextResponse.json({ error: "Interview not found." }, { status: 404 });
  if (session._count.questions > 0) {
    return NextResponse.json(
      {
        error:
          "This interview already has generated questions. Start a new interview to change its setup.",
      },
      { status: 409 }
    );
  }

  const data: {
    role?: string;
    seniority?: string;
    company?: string | null;
    companyType?: string | null;
    interviewType?: string | null;
    jobDescription?: string | null;
    questionCountTarget?: number;
  } = {};
  if (input.role !== undefined) data.role = input.role;
  if (input.seniority !== undefined) data.seniority = input.seniority;
  if (input.company !== undefined) data.company = input.company || null;
  if (input.companyType !== undefined) data.companyType = input.companyType || null;
  if (input.interviewType !== undefined) data.interviewType = input.interviewType || null;
  if (input.jobDescription !== undefined) data.jobDescription = input.jobDescription || null;
  if (input.questionCount !== undefined) data.questionCountTarget = input.questionCount;

  const updated = await prisma.interviewSession.update({
    where: { id: session.id },
    data,
    select: {
      id: true,
      role: true,
      seniority: true,
      company: true,
      companyType: true,
      interviewType: true,
      jobDescription: true,
      questionCountTarget: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, ...updated });
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
