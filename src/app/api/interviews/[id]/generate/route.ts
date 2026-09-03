import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateQuestions } from "@/lib/ai/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const encoder = new TextEncoder();

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const session = await prisma.interviewSession.findFirst({
    where: { id, userId: user.id },
    include: { questions: { select: { id: true } } },
  });
  if (!session) {
    return Response.json({ error: "Interview not found." }, { status: 404 });
  }
  if (session.questions.length > 0) {
    return Response.json(
      { error: "Questions for this interview have already been generated." },
      { status: 409 }
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: object) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // stream closed
        }
      };

      try {
        send({ type: "stage", key: "analyzing" });

        const result = await generateQuestions({
          role: session.role,
          seniority: session.seniority,
          company: session.company ?? undefined,
          jobDescription: session.jobDescription ?? undefined,
          count: session.questionCountTarget,
        });

        send({ type: "stage", key: "questions" });
        send({ type: "stage", key: "followups" });

        const rows = result.questions.map((q, orderIndex) => ({
          sessionId: session.id,
          question: q.question,
          category: q.category,
          difficulty: q.difficulty,
          reason: q.reason,
          suggestedAnswer: q.suggested_answer,
          followUps: q.follow_up_questions,
          orderIndex,
          status: "NOT_STARTED",
        }));

        await prisma.$transaction([
          prisma.interviewQuestion.createMany({ data: rows }),
          prisma.interviewSession.update({
            where: { id: session.id },
            data: { status: "READY" },
          }),
        ]);

        send({ type: "stage", key: "saving" });
        send({
          type: "done",
          questionCount: rows.length,
          provider: result.provider,
          model: result.model ?? null,
        });
      } catch (err) {
        console.error("[api] generation failed:", err);
        send({
          type: "error",
          message: "We couldn't generate your interview. Please try again.",
        });
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
