export type QuestionStatus = "NOT_STARTED" | "PRACTICED" | "SKIPPED";

/** One stored written-practice attempt, as shown in the workspace history. */
export interface WorkspaceAttempt {
  score: number | null;
  /** The exact prompt practiced — the main question or a follow-up. */
  prompt: string | null;
  createdAt: string;
}

export interface WorkspaceQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: string;
  reason: string;
  suggestedAnswer: string;
  followUps: string[];
  sourceContext: string[];
  orderIndex: number;
  status: QuestionStatus;
  lastScore: number | null;
  /** Newest written attempts first, capped per question (see attempt-history). */
  attempts: WorkspaceAttempt[];
  /** Autosaved written-practice draft, or null when there is none. */
  draftAnswer: string | null;
}

export interface WorkspaceSession {
  id: string;
  role: string;
  seniority: string;
  company: string | null;
  companyType: string | null;
  interviewType: string | null;
  jobDescription: string | null;
  status: "DRAFT" | "READY";
  questionCountTarget: number;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationFeedback {
  score: number;
  strengths: string[];
  missing: string[];
  improvements: string[];
}

/**
 * Setup-form values needed to repeat an interview without retyping it
 * ("practice again with this setup"). Shared by the data layer and the client
 * setup form, so it lives here rather than in either one.
 */
export interface InterviewSetupDefaults {
  role: string;
  seniority: string;
  company: string;
  companyType: string;
  interviewType: string;
  jobDescription: string;
  questionCount: number;
}

/* ----------------------- Mock interview debrief (Phase 4) ----------------------- */

export interface DebriefDimensionScore {
  dimension: string;
  score: number;
  note?: string;
  /** Verbatim quote or paraphrase from the transcript that justifies the score. */
  evidence?: string;
}

export interface DebriefData {
  overallScore: number;
  breakdown: DebriefDimensionScore[];
  strengths: string[];
  weaknesses: string[];
  missedOpportunities: string[];
  strongestAnswer: { question: string; why: string };
  weakestAnswer: { question: string; why: string };
  recommendedPractice: string[];
  provider?: string;
  model?: string;
}
