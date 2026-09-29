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
  /** Questions the candidate has already practiced — generation avoids
   *  repeating or rephrasing these so repeat sessions stay fresh. */
  avoidQuestions?: string[];
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
  /** The candidate's actual answer, when one exists. Follow-ups must target
   *  its content; a short/off-topic answer is probed for missing depth. */
  answer?: string;
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

/* ----------------------- AI mock interview (Phase 3) ----------------------- */

export type InterviewerAction =
  | "ask_question"
  | "ask_followup"
  | "move_topic"
  | "end_interview";

export interface InterviewerDecision {
  action: InterviewerAction;
  /** What the interviewer says out loud (a question, or a closing line when ending). */
  text: string;
  category?: QuestionCategory;
  difficulty?: QuestionDifficulty;
  /** Brief note on why this move was chosen (kept server-side, never shown as a score). */
  reason?: string;
}

export interface InterviewTranscriptTurn {
  speaker: "AI" | "CANDIDATE";
  text: string;
  /** Interviewer structured action, present on AI turns (Phase 3). */
  action?: string;
  /** Question category/difficulty, present on AI turns (used by debriefs). */
  category?: string;
  difficulty?: string;
}

/** One question available to the interviewer, drawn from the session bank. */
export interface InterviewerBankQuestion {
  question: string;
  category: string;
  difficulty: string;
  followUps: string[];
}

export interface InterviewerContext {
  role: string;
  seniority: string;
  company?: string;
  companyType?: string;
  interviewType?: string;
  jobDescription?: string;
  /** Compact normalized candidate context (see buildCandidateContextSummary). */
  candidateContext?: string;
  /** Number of main questions already asked (follow-ups excluded). */
  questionsAsked: number;
  /** Hard cap on main questions for this session. */
  maxQuestions: number;
  /** Recent transcript, oldest first. */
  history: InterviewTranscriptTurn[];
  /** Prepared questions the interviewer may draw from (may be empty). */
  questionBank: InterviewerBankQuestion[];
}

export interface InterviewerResult {
  decision: InterviewerDecision;
  provider: string;
  model?: string;
}

/* ----------------------- AI mock interview debrief (Phase 4) ----------------------- */

/** The six debrief dimensions (InterviewOS V1 vocabulary). */
export type DebriefDimension =
  | "technical"
  | "communication"
  | "structure"
  | "relevance"
  | "project_knowledge"
  | "problem_solving";

export const DEBRIEF_DIMENSIONS: DebriefDimension[] = [
  "technical",
  "communication",
  "structure",
  "relevance",
  "project_knowledge",
  "problem_solving",
];

export interface DebriefDimensionScore {
  dimension: DebriefDimension;
  /** 0–100. Session-level practice signal only — never an employability claim. */
  score: number;
  /** One short sentence on what the score reflects. */
  note?: string;
  /** A verbatim quote or precise paraphrase of the transcript moment that
   *  justifies the score — required in output, optional for legacy stored rows. */
  evidence?: string;
}

export interface DebriefAnswerHighlight {
  /** The question the candidate answered (the AI turn text that preceded it). */
  question: string;
  /** Why this answer stood out (good or bad). */
  why: string;
}

export interface DebriefResult {
  /** 0–100. Weighted from the breakdown below; practice score only. */
  overallScore: number;
  breakdown: DebriefDimensionScore[];
  strengths: string[];
  weaknesses: string[];
  missedOpportunities: string[];
  strongestAnswer: DebriefAnswerHighlight;
  weakestAnswer: DebriefAnswerHighlight;
  recommendedPractice: string[];
  /** Which provider produced this debrief ("openrouter" | "fallback"). */
  provider: string;
  model?: string;
}

export interface DebriefContext {
  role: string;
  seniority: string;
  company?: string;
  companyType?: string;
  interviewType?: string;
  jobDescription?: string;
  /** Compact normalized candidate context (see buildCandidateContextSummary). */
  candidateContext?: string;
  /** Cap on main questions for this session. */
  maxQuestions: number;
  /** Full transcript, oldest first. */
  transcript: InterviewTranscriptTurn[];
}

export interface AIProvider {
  readonly name: string;
  readonly model?: string;
  generateQuestions(ctx: GenerationContext): Promise<GeneratedQuestion[]>;
  generateFollowUps(ctx: FollowUpContext): Promise<string[]>;
  evaluateAnswer(ctx: EvaluationContext): Promise<EvaluationResult>;
  /** Structured extraction of resume facts. Never invents content. */
  extractResume(text: string): Promise<ResumeData>;
  /** Decide the interviewer's next move during a live mock interview. */
  driveInterview(ctx: InterviewerContext): Promise<InterviewerDecision>;
  /** Produce a session-level debrief from a completed mock transcript. */
  generateDebrief(ctx: DebriefContext): Promise<DebriefResult>;
}
