import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractPdfText } from "@/lib/resume";
import { extractResumeData } from "@/lib/ai/service";
import { isPdfBuffer, looksLikePdfName, sanitizeFilename } from "@/lib/file-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3 MB

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  if (!looksLikePdfName(file.name) && file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Please upload a PDF resume (text-based PDFs work best)." },
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
    if (!isPdfBuffer(buffer)) {
      return NextResponse.json(
        { error: "That file is not a valid PDF (missing the PDF header)." },
        { status: 415 }
      );
    }
    text = await extractPdfText(buffer);
  } catch {
    // Never surface parser internals (they can leak paths/versions); the
    // details go to the server log instead.
    console.error("Resume parse failed for interview", session.id);
    return NextResponse.json(
      { error: "We couldn't read that PDF. Please upload a valid text-based PDF." },
      { status: 422 }
    );
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
