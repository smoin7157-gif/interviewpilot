/**
 * Practice analytics — the pure half of the dashboard's "where am I, and what
 * should I do next?" panels.
 *
 * Kept free of Prisma so the rules below (streak math, next-step decision) are
 * unit-testable without a database. `data.ts` runs the queries and hands the
 * plain numbers in.
 */

/** Local calendar day as `YYYY-MM-DD`. Local — a streak is about the user's day. */
export function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Consecutive days of practice ending today.
 *
 * A day counts if it contains any practice activity. The streak is allowed to
 * end yesterday — otherwise it would read as broken every morning until the
 * user practices, which punishes people for sleeping rather than skipping.
 * Returns 0 when neither today nor yesterday has activity.
 */
export function currentStreak(dayKeys: Set<string>, now: Date): number {
  const cursor = new Date(now);
  if (!dayKeys.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!dayKeys.has(dayKey(cursor))) return 0;
  }
  let streak = 0;
  while (dayKeys.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Convenience wrapper: distinct activity days from a list of timestamps. */
export function streakFromDates(dates: Date[], now: Date = new Date()): number {
  const keys = new Set(dates.map(dayKey));
  return currentStreak(keys, now);
}

export interface PracticeStats {
  interviews: number;
  questionsGenerated: number;
  questionsPracticed: number;
  mocksCompleted: number;
  /** Mean overall mock score, or null when nothing has been scored. */
  averageScore: number | null;
  /** Highest overall mock score, or null when nothing has been scored. */
  bestScore: number | null;
  /** Consecutive days of practice ending today (or yesterday). */
  streakDays: number;
  /** Distinct days with any practice activity in the recent window. */
  practiceDays: number;
}

export function emptyPracticeStats(): PracticeStats {
  return {
    interviews: 0,
    questionsGenerated: 0,
    questionsPracticed: 0,
    mocksCompleted: 0,
    averageScore: null,
    bestScore: null,
    streakDays: 0,
    practiceDays: 0,
  };
}

export interface NextStepInput {
  interviews: number;
  questionsGenerated: number;
  questionsPracticed: number;
  mocksCompleted: number;
  /** The most recent mock, when one exists. */
  latestMock: { id: string; hasDebrief: boolean } | null;
}

export interface NextStep {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  tone: "start" | "continue" | "review";
}

/**
 * The single most useful thing to do next, derived from where the user actually
 * is. Ordered from "you have nothing yet" to "you're ready to rehearse out
 * loud" — one recommendation, never a wall of options.
 */
export function nextBestStep(input: NextStepInput): NextStep {
  if (input.interviews === 0) {
    return {
      eyebrow: "Start here",
      title: "Create your first interview",
      body: "Tell us the role you're targeting and we'll generate realistic questions to practice against.",
      href: "/interviews/new",
      cta: "Create interview",
      tone: "start",
    };
  }

  if (input.questionsGenerated === 0) {
    return {
      eyebrow: "Almost there",
      title: "Generate your questions",
      body: "You've set up an interview — generate its question set and start practicing.",
      href: "/interviews",
      cta: "Generate questions",
      tone: "continue",
    };
  }

  if (input.questionsPracticed < input.questionsGenerated) {
    const remaining = input.questionsGenerated - input.questionsPracticed;
    return {
      eyebrow: "Continue",
      title: `Keep going — ${remaining} ${remaining === 1 ? "question" : "questions"} left`,
      body: "Pick up where you left off. Each answer gets scored with specific, actionable feedback.",
      href: "/interviews",
      cta: "Continue practicing",
      tone: "continue",
    };
  }

  if (input.mocksCompleted === 0) {
    return {
      eyebrow: "Level up",
      title: "Try a spoken mock interview",
      body: "You've practiced every question — now rehearse aloud with the AI interviewer and get a scored debrief.",
      href: "/interviews",
      cta: "Practice aloud",
      tone: "continue",
    };
  }

  if (input.latestMock && !input.latestMock.hasDebrief) {
    return {
      eyebrow: "Review",
      title: "Your last mock has no debrief yet",
      body: "Generate the debrief to see your six-dimension breakdown and what to practice next.",
      href: `/history/${input.latestMock.id}`,
      cta: "Open debrief",
      tone: "review",
    };
  }

  return {
    eyebrow: "Keep the streak",
    title: "Rehearse another session",
    body: "Repeat a role you've practiced, or start a fresh interview for a different job you're targeting.",
    href: "/interviews/new",
    cta: "New interview",
    tone: "continue",
  };
}
