/**
 * InterviewOS seed script — creates a demo account with a sample interview
 * so the product flow is immediately explorable.
 *
 * Idempotent and atomic: if the demo user is fully seeded it does nothing;
 * if a previous run left partial data (e.g. interrupted), the partial rows
 * are replaced (cascade deletes) and the seed re-runs in one transaction.
 * Requires DATABASE_URL in the environment (or .env), like the app itself.
 *
 *   npx prisma db seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@interviewos.app";
const DEMO_PASSWORD = "DemoPass123!";

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    include: { sessions: { include: { _count: { select: { questions: true } } } } },
  });

  const fullySeeded =
    existing && existing.sessions.length > 0 && existing.sessions[0]._count.questions > 0;
  if (fullySeeded) {
    console.log(`Seed skipped — demo user ${DEMO_EMAIL} is already fully seeded.`);
    return;
  }

  // Remove any partial prior seed (cascade removes sessions/questions/attempts).
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
    console.log("Removed incomplete previous seed data.");
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const starterQuestions = [
    {
      category: "technical",
      difficulty: "medium",
      question: "Explain how the browser renders a page after the HTML arrives.",
      reason: "Tests core rendering-pipeline knowledge.",
      suggestedAnswer:
        "HTML is parsed into a DOM tree while CSS is parsed into CSSOM; both combine into a render tree, then layout computes geometry and paint draws pixels, with compositing layers for animations.",
    },
    {
      category: "behavioral",
      difficulty: "medium",
      question: "Tell me about a time you disagreed with a teammate about the right approach.",
      reason: "Tests collaboration and communication.",
      suggestedAnswer:
        "I focused on data and shared goals, proposed a small experiment to compare both approaches, and we adopted the better-performing one while keeping the teammate's constraints in mind.",
    },
    {
      category: "project",
      difficulty: "hard",
      question: "Walk me through the most technically interesting project you've shipped.",
      reason: "Tests depth and ownership of real work.",
      suggestedAnswer:
        "I describe the problem, the trade-offs I considered, the architecture I chose, and the measurable outcome, then what I'd do differently next time.",
    },
  ];

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: DEMO_EMAIL,
        name: "Demo Candidate",
        passwordHash,
      },
    });

    const session = await tx.interviewSession.create({
      data: {
        userId: user.id,
        role: "Senior Frontend Engineer",
        seniority: "3–5 years",
        company: "Acme Labs",
        companyType: "Startup",
        interviewType: "Technical",
        status: "READY",
        questionCountTarget: 10,
      },
    });

    await tx.interviewQuestion.createMany({
      data: starterQuestions.map((q, i) => ({
        sessionId: session.id,
        ...q,
        followUps: [],
        sourceContext: ["general"],
        orderIndex: i,
        status: "NOT_STARTED",
      })),
    });
  });

  console.log(`Seeded demo user: ${DEMO_EMAIL} (password: ${DEMO_PASSWORD})`);
  console.log(`Sample interview: "Senior Frontend Engineer" with ${starterQuestions.length} questions.`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });