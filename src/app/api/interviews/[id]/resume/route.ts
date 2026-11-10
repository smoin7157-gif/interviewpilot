import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractDocxText, extractPdfText } from "@/lib/resume";
import { extractResumeData } from "@/lib/ai/service";
import {
  isPdfBuffer,
  isZipBuffer,
  looksLikeDocxName,
  looksLikePdfName,
  sanitizeFilename,
} from "@/lib/file-check";
import { checkRateLimit, rateLimitError } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3 MB
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`resume:${user.id}`, { limit: 10, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) return rateLimitError(rl.retryAfterSeconds);

  const { id } = await params;
  const session = await prisma.interviewSession.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!session) return NextResponse.json({ error: "Interview not found." }, { status: 404 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("resume");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No resume file was uploaded." }, { status: 400 });
  }
  const isDocxName = looksLikeDocxName(file.name) || file.type === DOCX_MIME;
  if (!looksLikePdfName(file.name) && file.type !== "application/pdf" && !isDocxName) {
    return NextResponse.json(
      { error: "Please upload a PDF or Word (.docx) resume — text-based files work best." },
      { status: 415 }
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "That resume is larger than 3 MB. Please upload a smaller file." }, { status: 413 });
  }

  let text: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    // Magic-byte check: the extension/MIME can be spoofed, the content cannot.
    // The parser is chosen from the content, so a .docx rename still reads.
    if (isPdfBuffer(buffer)) {
      text = await extractPdfText(buffer);
    } else if (isZipBuffer(buffer)) {
      text = await extractDocxText(buffer);
    } else {
      return NextResponse.json(
        { error: "That file is not a valid PDF or Word document." },
        { status: 415 }
      );
    }
  } catch (err) {
    // Parser failures throw our own user-facing messages; anything unexpected
    // (paths, versions) is logged server-side and replaced with a generic one.
    console.error("Resume parse failed for interview", session.id);
    const message =
      err instanceof Error && err.message.startsWith("We couldn't")
        ? err.message
        : "We couldn't read that file. Please upload a text-based PDF or Word document.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const { result, provider, model } = await extractResumeData(text);

  await prisma.interviewSession.update({
    where: { id: session.id },
    data: { resumeFileName: sanitizeFilename(file.name), resumeContext: result as unknown as Prisma.InputJsonValue },
  });

  const count = (list: string[]) => list.length;
  return NextResponse.json({
    ok: true,
    filename: sanitizeFilename(file.name),
    provider,
    model: model ?? null,
    summary: {
      skills: count(result.skills),
      experience: count(result.experience),
      projects: count(result.projects),
      education: count(result.education),
      technologies: count(result.technologies),
    },
  });
}
