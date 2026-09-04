import type { ResumeData } from "@/lib/candidate-context";

/** InterviewOS question categories (lowercase keys). Legacy rows may still store
 *  the older capitalized set (Technical, Behavioral, Project, Role-specific, General). */
export type QuestionCategory =
  | "technical"
  | "behavioral"
  | "project"
  | "job_description"
  | "coding"
  | "system_design"
  | "data_ml"
  | "company"
  | "general";

export type QuestionDifficulty = "easy" | "medium" | "hard";

export interface GeneratedQuestion {
  question: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  reason: string;
  /** Which candidate/job source this question draws from. */
  source_context: string[];
  suggested_answer: string;
  follow_up_questions: string[];
}

export interface GenerationContext {
  role: string;
  seniority: string;
  company?: string;
  companyType?: string;
  interviewType?: string;
  jobDescription?: string;
  /** Compact, normalized candidate context summary (see buildCandidateContextSummary). */
  candidateContext?: string;
  count: number;
}

export interface FollowUpContext {
  question: string;
  role: string;
  seniority: string;
  company?: string;
  companyType?: string;
  interviewType?: string;
  jobDescription?: string;
}

export interface EvaluationContext {
  prompt: string; // the exact question (or follow-up) being answered
  suggestedAnswer?: string;
  answer: string;
  role: string;
}

export interface EvaluationResult {
  score: number;
  strengths: string[];
  missing: string[];
  improvements: string[];
}

export interface GenerationResult {
  questions: GeneratedQuestion[];
  provider: string;
  model?: string;
}

export interface AIProvider {
  readonly name: string;
  readonly model?: string;
  generateQuestions(ctx: GenerationContext): Promise<GeneratedQuestion[]>;
  generateFollowUps(ctx: FollowUpContext): Promise<string[]>;
  evaluateAnswer(ctx: EvaluationContext): Promise<EvaluationResult>;
  /** Structured extraction of resume facts. Never invents content. */
  extractResume(text: string): Promise<ResumeData>;
}
