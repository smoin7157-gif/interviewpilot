import type { DebriefContext, DebriefResult, InterviewTranscriptTurn } from "@/lib/ai/types";
import {
  buildCandidateContextSummary,
  type CandidateProjectData,
  type GithubProfileData,
  type ResumeData,
} from "@/lib/candidate-context";
import { turnsToHistory } from "@/lib/mock";

/**
 * Mock-interview debrief assembly (InterviewOS Phase 4).
 *
 * A debrief is a session-level practice score derived ONLY from the stored
 * transcript (mock_interview_sessions.debrief + interview_turns). It is
 * practice feedback for the candidate's own growth — never an employability
 * or hiring claim. Transcripts are trimmed to a fixed budget before any LLM
 * call so debriefs stay cheap and predictable.
 */

/** Maximum transcript characters sent to the LLM (cost control). */
const DEBRIEF_TRANSCRIPT_BUDGET = 8_000;

/** A debrief is meaningful once the candidate answered at least two questions. */
export const MIN_ANSWERS_FOR_DEBRIEF = 2;

export interface DebriefSource {
  role: string;
  seniority: string;
  company: string | null;
  companyType: string | null;
  interviewType: string | null;
  jobDescription: string | null;
  resumeContext: unknown;
  githubContext: unknown;
  projects: CandidateProjectData[];
  maxQuestions: number;
  turns: Array<{
    speaker: string;
    transcript: string;
    action?: string | null;
    category?: string | null;
    difficulty?: string | null;
  }>;
}

export function countCandidateAnswers(turns: DebriefSource["turns"]): number {
  return turns.filter((t) => t.speaker === "CANDIDATE" && t.transcript.trim().length > 0).length;
}

/**
 * Builds the DebriefContext the AI providers consume, applying the transcript
 * budget: answers are kept whole (trimmed to 900 chars each, as in the live
 * interviewer), and the oldest turns are dropped first if the total exceeds
 * the budget so the freshest exchanges always survive.
 */
export function buildDebriefContext(source: DebriefSource): DebriefContext {
  const history = turnsToHistory(source.turns);

  const budgeted: InterviewTranscriptTurn[] = [];
  let used = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    const cost = turn.text.length + 24; // +24 ≈ speaker/action/category labels
    if (used + cost > DEBRIEF_TRANSCRIPT_BUDGET) {
      if (turn.speaker === "CANDIDATE") break; // never truncate mid-answer
      continue;
    }
    budgeted.unshift(turn);
    used += cost;
  }

  const candidateContext = buildCandidateContextSummary({
    role: source.role,
    seniority: source.seniority,
    company: source.company,
    companyType: source.companyType,
    interviewType: source.interviewType,
    jobDescription: null, // JD travels as its own field below
    resumeContext: (source.resumeContext ?? null) as ResumeData | null,
    githubContext: (source.githubContext ?? null) as GithubProfileData | null,
    projects: source.projects,
  });

  return {
    role: source.role,
    seniority: source.seniority,
    company: source.company ?? undefined,
    companyType: source.companyType ?? undefined,
    interviewType: source.interviewType ?? undefined,
    jobDescription: (source.jobDescription ?? "").trim().slice(0, 2_500) || undefined,
    candidateContext: candidateContext || undefined,
    maxQuestions: source.maxQuestions,
    transcript: budgeted,
  };
}

export type StoredDebrief = DebriefResult;