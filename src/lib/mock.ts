import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  buildCandidateContextSummary,
  type GithubProfileData,
  type ResumeData,
} from "@/lib/candidate-context";
import type {
  InterviewerBankQuestion,
  InterviewerContext,
  InterviewTranscriptTurn,
} from "@/lib/ai/types";
import {
  buildCursorPage,
  HISTORY_PAGE_SIZE,
  type CursorPage,
  type PageParams,
} from "@/lib/pagination";

/**
 * Mock-interview data helpers (InterviewOS Phase 3).
 *
 * A mock rehearses one prepared InterviewSession. Ownership is always derived
 * from the authenticated user; turns are stored as plain text transcripts only
 * (no raw audio/video). Statuses follow the session state machine:
 * SESSION_STARTED → … → SESSION_COMPLETE | ERROR.
 */

export const TERMINAL_STATUSES = ["SESSION_COMPLETE", "ERROR"] as const;

export async function getOwnedMockSession(userId: string, mockId: string) {
  return prisma.mockInterviewSession.findFirst({
    where: { id: mockId, userId },
    include: { turns: { orderBy: { turnIndex: "asc" as const } } },
  });
}

export async function getOwnedInterviewSession(userId: string, interviewSessionId: string) {
  return prisma.interviewSession.findFirst({
    where: { id: interviewSessionId, userId },
    include: {
      questions: { orderBy: { orderIndex: "asc" as const } },
      projects: true,
    },
  });
}

/** Any mock for this interview that is still in progress (resumable). */
export async function getActiveMock(userId: string, interviewSessionId: string) {
  return prisma.mockInterviewSession.findFirst({
    where: {
      userId,
      interviewSessionId,
      status: { notIn: [...TERMINAL_STATUSES] },
    },
    orderBy: { createdAt: "desc" },
    include: { turns: { orderBy: { turnIndex: "asc" as const } } },
  });
}

export function turnsToHistory(turns: Array<{
  speaker: string;
  transcript: string;
  action?: string | null;
  category?: string | null;
  difficulty?: string | null;
}>): InterviewTranscriptTurn[] {
  return turns.map((t) => ({
    speaker: t.speaker === "AI" ? "AI" : "CANDIDATE",
    // Trim long utterances so repeated LLM calls stay cheap.
    text: t.transcript.trim().slice(0, 900),
    action: t.speaker === "AI" ? (t.action ?? undefined) : undefined,
    category: t.speaker === "AI" ? (t.category ?? undefined) : undefined,
    difficulty: t.speaker === "AI" ? (t.difficulty ?? undefined) : undefined,
  }));
}

/** Number of main questions asked so far (follow-ups excluded). */
export function countMainQuestions(turns: Array<{ speaker: string; action: string | null }>): number {
  return turns.filter(
    (t) => t.speaker === "AI" && (t.action === "ask_question" || t.action === "move_topic")
  ).length;
}

const truncate = (value: string | null | undefined, max: number): string | undefined => {
  const text = (value ?? "").trim();
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

/** Builds the full InterviewerContext for one decision from a session's data. */
export function buildInterviewerContext(input: {
  role: string;
  seniority: string;
  company: string | null;
  companyType: string | null;
  interviewType: string | null;
  jobDescription: string | null;
  resumeContext: unknown;
  githubContext: unknown;
  projects: Array<{ name: string; repositoryUrl: string | null; description: string | null; techStack: string | null; contribution: string | null }>;
  questions: Array<{ question: string; category: string; difficulty: string; followUps: unknown }>;
  history: InterviewTranscriptTurn[];
  questionsAsked: number;
  maxQuestions: number;
}): InterviewerContext {
  const questionBank: InterviewerBankQuestion[] = input.questions.map((q) => ({
    question: q.question,
    category: q.category,
    difficulty: q.difficulty,
    followUps: Array.isArray(q.followUps)
      ? (q.followUps as string[]).map((f) => f.trim()).filter(Boolean).slice(0, 4)
      : [],
  }));

  const candidateContext = buildCandidateContextSummary({
    role: input.role,
    seniority: input.seniority,
    company: input.company,
    companyType: input.companyType,
    interviewType: input.interviewType,
    jobDescription: null, // JD travels as its own field below
    resumeContext: (input.resumeContext ?? null) as ResumeData | null,
    githubContext: (input.githubContext ?? null) as GithubProfileData | null,
    projects: input.projects,
  });

  return {
    role: input.role,
    seniority: input.seniority,
    company: input.company ?? undefined,
    companyType: input.companyType ?? undefined,
    interviewType: input.interviewType ?? undefined,
    jobDescription: truncate(input.jobDescription, 3_500),
    candidateContext: candidateContext || undefined,
    questionsAsked: input.questionsAsked,
    maxQuestions: input.maxQuestions,
    history: input.history.slice(-10),
    questionBank,
  };
}

/* ----------------------- Mock history (Phase 4) ----------------------- */

export interface MockHistoryRow {
  id: string;
  interviewSessionId: string;
  role: string;
  company: string | null;
  seniority: string;
  interviewType: string | null;
  status: string;
  overallScore: number | null;
  hasDebrief: boolean;
  questionsAsked: number;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
}

/** Selected columns every mock-history query needs: context + a filtered turn count. */
const mockHistoryInclude = {
  session: {
    select: { role: true, company: true, seniority: true, interviewType: true },
  },
  // A filtered relation count makes the live-marker count a server-side
  // aggregate: the list no longer loads every turn row (and reads it into
  // memory) only to count the interviewer's main questions.
  _count: {
    select: {
      turns: {
        where: { speaker: "AI", action: { in: ["ask_question", "move_topic"] as string[] } },
      },
    },
  },
} as const;

type MockHistorySource = Prisma.MockInterviewSessionGetPayload<{
  include: typeof mockHistoryInclude;
}>;

/**
 * Assemble MockHistoryRows from already-fetched mocks.
 * (Kept separate from the query so both the full history and the
 * take-limited dashboard strip share the same mapping.)
 */
function toHistoryRows(mocks: MockHistorySource[]): MockHistoryRow[] {
  return mocks.map((mock) => ({
    id: mock.id,
    interviewSessionId: mock.interviewSessionId,
    role: mock.session.role,
    company: mock.session.company,
    seniority: mock.session.seniority,
    interviewType: mock.session.interviewType,
    status: mock.status,
    overallScore: mock.overallScore,
    hasDebrief: Boolean(mock.debrief && mock.overallScore != null),
    questionsAsked: mock._count.turns,
    startedAt: mock.startedAt,
    endedAt: mock.endedAt,
    createdAt: mock.createdAt,
  }));
}

/** Every mock session a user owns, newest first, with its interview context. */
export async function listOwnedMocks(userId: string): Promise<MockHistoryRow[]> {
  const mocks = await prisma.mockInterviewSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" as const },
    include: mockHistoryInclude,
  });
  return toHistoryRows(mocks);
}

/**
 * One page of a user's mock history, newest first. Keyset-paginated so the
 * list (and the turn rows it joins) stays a flat 10-session query no matter
 * how long the history gets.
 */
export async function listOwnedMocksPage(
  userId: string,
  params: PageParams
): Promise<CursorPage<MockHistoryRow>> {
  const { cursor, direction } = params;
  const mocks = await prisma.mockInterviewSession.findMany({
    where: { userId },
    // `id` breaks ties so the cursor stays deterministic when several mocks
    // share a `createdAt` (bulk seeding, same-second sessions).
    orderBy:
      direction === "newer"
        ? [{ createdAt: "asc" as const }, { id: "asc" as const }]
        : [{ createdAt: "desc" as const }, { id: "desc" as const }],
    take: HISTORY_PAGE_SIZE + 1,
    // The cursor row is the boundary itself and lives on the neighbouring
    // page, so it is skipped in both directions; the over-fetched row is what
    // proves that neighbour exists.
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: mockHistoryInclude,
  });

  const page = buildCursorPage(mocks, HISTORY_PAGE_SIZE, direction, Boolean(cursor));
  return { ...page, items: toHistoryRows(page.items) };
}

/** One scored session on the progress chart. */
export interface MockScorePoint {
  id: string;
  score: number;
  role: string;
  createdAt: Date;
}

/**
 * The user's scored mock sessions in chronological order (oldest first), capped
 * at the most recent `limit`. Selecting only the columns the chart needs keeps
 * the dashboard query off the transcript tables entirely.
 */
export async function listScoreTrend(userId: string, limit = 20): Promise<MockScorePoint[]> {
  const rows = await prisma.mockInterviewSession.findMany({
    where: { userId, overallScore: { not: null } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      overallScore: true,
      createdAt: true,
      session: { select: { role: true } },
    },
  });

  return rows
    .filter((row) => row.overallScore != null)
    .reverse()
    .map((row) => ({
      id: row.id,
      score: row.overallScore as number,
      role: row.session.role,
      createdAt: row.createdAt,
    }));
}

/**
 * Take-limited mock history for the dashboard strip — same shape as
 * listOwnedMocks but only loads `limit` rows (and only their turn
 * speaker/action columns) instead of the user's entire mock history.
 */
export async function listRecentMocks(userId: string, limit = 3): Promise<MockHistoryRow[]> {
  const mocks = await prisma.mockInterviewSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" as const },
    take: limit,
    include: mockHistoryInclude,
  });
  return toHistoryRows(mocks);
}

/** One owned mock with its full transcript + interview context (debrief page). */
export async function getOwnedMockWithInterview(userId: string, mockId: string) {
  return prisma.mockInterviewSession.findFirst({
    where: { id: mockId, userId },
    include: {
      turns: { orderBy: { turnIndex: "asc" as const } },
      session: {
        select: {
          id: true,
          role: true,
          company: true,
          seniority: true,
          interviewType: true,
          companyType: true,
        },
      },
    },
  });
}
