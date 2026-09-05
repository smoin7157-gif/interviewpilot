import { prisma } from "@/lib/db";
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

export function turnsToHistory(turns: Array<{ speaker: string; transcript: string; action?: string | null }>): InterviewTranscriptTurn[] {
  return turns.map((t) => ({
    speaker: t.speaker === "AI" ? "AI" : "CANDIDATE",
    // Trim long utterances so repeated LLM calls stay cheap.
    text: t.transcript.trim().slice(0, 900),
    action: t.speaker === "AI" ? (t.action ?? undefined) : undefined,
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

export interface MockTurnOutcome {
  action: string;
  text: string;
  category?: string;
  difficulty?: string;
  reason?: string;
  /** 1-based main-question number after this turn (for "Question 2 of N"). */
  questionNumber: number;
  maxQuestions: number;
  completed: boolean;
  provider: string;
  model?: string;
}
