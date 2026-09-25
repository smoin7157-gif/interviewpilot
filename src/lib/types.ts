export type QuestionStatus = "NOT_STARTED" | "PRACTICED" | "SKIPPED";

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

/* ----------------------- Mock interview debrief (Phase 4) ----------------------- */

export interface DebriefDimensionScore {
  dimension: string;
  score: number;
  note?: string;
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
