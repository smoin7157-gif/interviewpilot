export type QuestionCategory = "Technical" | "Behavioral" | "Project" | "Role-specific" | "General";
export type QuestionDifficulty = "Easy" | "Medium" | "Hard";

export interface GeneratedQuestion {
  question: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  reason: string;
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
}
