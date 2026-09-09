import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { practiceStatusSchema } from "@/lib/validation";
import { checkRateLimit, rateLimitError } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`practice:${user.id}`, { limit: 60, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) return rateLimitError(rl.retryAfterSeconds);

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = practiceStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Status must be PRACTICED or SKIPPED." }, { status: 422 });
  }

  const question = await prisma.interviewQuestion.findFirst({
    where: { id, session: { userId: user.id } },
    select: { id: true, sessionId: true },
  });
  if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });

  await prisma.$transaction([
    prisma.interviewQuestion.update({
      where: { id: question.id },
      data: { status: parsed.data.status },
    }),
    prisma.interviewSession.update({
      where: { id: question.sessionId },
      data: { updatedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true, status: parsed.data.status });
}
