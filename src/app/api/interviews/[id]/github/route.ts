import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { analyzeGithubProfile } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const session = await prisma.interviewSession.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!session) return NextResponse.json({ error: "Interview not found." }, { status: 404 });

  let body: { url?: unknown };
  try {
    body = (await request.json()) as { url?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body.url !== "string" || body.url.trim().length === 0) {
    return NextResponse.json({ error: "Enter your GitHub profile URL." }, { status: 422 });
  }

  let data;
  try {
    data = await analyzeGithubProfile(body.url);
  } catch (err) {
    console.error("GitHub profile fetch failed:", body.url, err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "We couldn't reach GitHub for that profile. Check the URL and try again." },
      { status: 422 }
    );
  }

  await prisma.interviewSession.update({
    where: { id: session.id },
    data: {
      githubUrl: body.url.trim(),
      githubContext: data as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({
    ok: true,
    username: data.username,
    repoCount: data.repoCount,
    languages: data.languages,
    topRepos: data.topRepos.slice(0, 5).map((r) => ({
      name: r.name,
      language: r.language,
      stars: r.stars,
    })),
  });
}
