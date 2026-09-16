import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateQuestions } from "@/lib/ai/service";
import { checkRateLimit, rateLimitError } from "@/lib/rate-limit";
import {
  buildCandidateContextSummary,
  type CandidateProjectData,
  type GithubProfileData,
  type ResumeData,
} from "@/lib/candidate-context";
import { listGeneratedQuestions } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const encoder = new TextEncoder();

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(`generate:${user.id}`, { limit: 10, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) return rateLimitError(rl.retryAfterSeconds);

  const { id } = await params;
  const session = await prisma.interviewSession.findFirst({
    where: { id, userId: user.id },
    include: { questions: { select: { id: true } }, projects: true },
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

        // Repeat sessions must feel fresh: pass everything this user has
        // already had generated as an avoid-list for the question engine.
        const avoidQuestions = await listGeneratedQuestions(user.id);
        const result = await generateQuestions({
          role: session.role,
          seniority: session.seniority,
          company: session.company ?? undefined,
          companyType: session.companyType ?? undefined,
          interviewType: session.interviewType ?? undefined,
          jobDescription: session.jobDescription ?? undefined,
          candidateContext: buildCandidateContextSummary({
            role: session.role,
            seniority: session.seniority,
            company: session.company,
            companyType: session.companyType,
            interviewType: session.interviewType,
            jobDescription: session.jobDescription,
            resumeContext: session.resumeContext as ResumeData | null,
            githubContext: session.githubContext as GithubProfileData | null,
            projects: session.projects as CandidateProjectData[],
          }),
          avoidQuestions,
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
          sourceContext: q.source_context,
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
