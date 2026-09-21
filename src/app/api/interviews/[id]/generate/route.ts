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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  // Tracks whether the client is still listening. The NDJSON stream can only
  // observe a disconnect by failing to write, so we probe after each stage:
  // once the client is gone we abandon the generation instead of burning AI
  // tokens for nobody.
  let clientGone = false;
  const abortGeneration = () => {
    clientGone = true;
  };
  // Fire-and-forget probe: when the connection drops, `request.signal` aborts
  // (Node 18+/Next 16 route handlers) and cancels this stream.
  request.signal.addEventListener("abort", abortGeneration, { once: true });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;

      const closeQuietly = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      // Each enqueue is wrapped: once the client is gone, further writes are
      // pointless and would only pile up in the queue.
      const send = (event: object) => {
        if (clientGone || closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // Stream already errored/closed — the client is gone.
          clientGone = true;
        }
      };

      try {
        send({ type: "stage", key: "analyzing" });

        // Repeat sessions must feel fresh: pass everything this user has
        // already had generated as an avoid-list for the question engine.
        const avoidQuestions = clientGone ? [] : await listGeneratedQuestions(user.id);
        const result = clientGone
          ? null
          : await generateQuestions({
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

        if (!result) {
          // The client disconnected before generation finished — nothing was
          // saved yet, so there is nothing to clean up in the DB. The
          // GeneratePanel client retries on mount anyway, and the session
          // stays in DRAFT so it can be regenerated fresh.
          return;
        }

        send({ type: "stage", key: "questions" });
        send({ type: "stage", key: "followups" });
        if (clientGone) return;

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

        // (clientGone was already checked via `result` above; re-derive the
        // disconnect flag so the remaining sends skip cleanly.)
        if (clientGone) return;

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
        if (!clientGone) {
          console.error("[api] generation failed:", err);
          send({
            type: "error",
            message: "We couldn't generate your interview. Please try again.",
          });
        }
      } finally {
        closeQuietly();
      }
    },
    // Client disconnected (tab closed, navigation, fetch aborted): flip the
    // flag so any in-flight awaits stop at the next checkpoint above.
    cancel() {
      clientGone = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
      // Some proxies buffer NDJSON unless flushing is hinted.
      "X-Accel-Buffering": "no",
    },
  });
}
