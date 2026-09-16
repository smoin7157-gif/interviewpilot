import {
  buildDebriefUserPrompt,
  buildEvaluationUserPrompt,
  buildFollowUpUserPrompt,
  buildGenerationUserPrompt,
  buildInterviewerUserPrompt,
  buildResumeExtractionUserPrompt,
  DEBRIEF_SYSTEM_PROMPT,
  EVALUATION_SYSTEM_PROMPT,
  FOLLOWUP_SYSTEM_PROMPT,
  GENERATION_SYSTEM_PROMPT,
  INTERVIEWER_SYSTEM_PROMPT,
  RESUME_EXTRACTION_SYSTEM_PROMPT,
} from "./prompts";
import type { ResumeData } from "@/lib/candidate-context";
import type {
  AIProvider,
  DebriefContext,
  DebriefResult,
  EvaluationContext,
  EvaluationResult,
  FollowUpContext,
  GeneratedQuestion,
  GenerationContext,
  InterviewerContext,
  InterviewerDecision,
} from "./types";
import {
  parseDebrief,
  parseEvaluation,
  parseFollowUps,
  parseInterviewerDecision,
  parseQuestions,
  parseResume,
} from "./validate";

const DEFAULT_MODEL = "openai/gpt-4o-mini";
// Cheap/fast model for bulk extraction tasks (resume parsing, answer
// evaluation). Override with OPENROUTER_CHEAP_MODEL to cut costs further.
const CHEAP_MODEL = process.env.OPENROUTER_CHEAP_MODEL ?? DEFAULT_MODEL;
const BASE_URL = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
const API_KEY = process.env.OPENROUTER_API_KEY;

function timeoutSignal(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

// Hard ceiling for completion output. Must stay within every model's output
// cap (gpt-4o-mini: 16,384) — a larger request makes OpenRouter reject the
// whole call, which silently degrades every live AI feature to fallback.
const MAX_COMPLETION_TOKENS = 16_000;

export class OpenRouterProvider implements AIProvider {
  readonly name = "openrouter";
  readonly model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  constructor() {
    if (!API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured.");
    }
  }

  private async chatCompletion(
    system: string,
    user: string,
    maxTokens: number,
    model: string = this.model,
    temperature = 0.7
  ): Promise<string> {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
        "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
        "X-Title": "InterviewOS",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
      signal: timeoutSignal(120_000),
    });

    if (!res.ok) {
      let detail = "";
      try {
        const body = (await res.json()) as { error?: { message?: string } };
        detail = body.error?.message ?? "";
      } catch {
        // ignore
      }
      throw new Error(`OpenRouter request failed (${res.status}): ${detail || res.statusText}`.trim());
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenRouter returned an empty completion.");
    return content;
  }

  async generateQuestions(ctx: GenerationContext): Promise<GeneratedQuestion[]> {
    const raw = await this.chatCompletion(
      GENERATION_SYSTEM_PROMPT,
      buildGenerationUserPrompt(ctx),
      MAX_COMPLETION_TOKENS
    );
    return parseQuestions(raw);
  }

  async generateFollowUps(ctx: FollowUpContext): Promise<string[]> {
    const raw = await this.chatCompletion(FOLLOWUP_SYSTEM_PROMPT, buildFollowUpUserPrompt(ctx), 2_000, CHEAP_MODEL);
    return parseFollowUps(raw);
  }

  async evaluateAnswer(ctx: EvaluationContext): Promise<EvaluationResult> {
    const raw = await this.chatCompletion(
      EVALUATION_SYSTEM_PROMPT,
      buildEvaluationUserPrompt(ctx),
      2_000,
      CHEAP_MODEL,
      0.2 // scoring must be consistent, not creative
    );
    return parseEvaluation(raw);
  }

  async extractResume(text: string): Promise<ResumeData> {
    const raw = await this.chatCompletion(
      RESUME_EXTRACTION_SYSTEM_PROMPT,
      buildResumeExtractionUserPrompt(text),
      3_000,
      CHEAP_MODEL
    );
    return parseResume(raw);
  }

  async driveInterview(ctx: InterviewerContext): Promise<InterviewerDecision> {
    const raw = await this.chatCompletion(
      INTERVIEWER_SYSTEM_PROMPT,
      buildInterviewerUserPrompt(ctx),
      700
    );
    return parseInterviewerDecision(raw);
  }

  async generateDebrief(ctx: DebriefContext): Promise<DebriefResult> {
    const raw = await this.chatCompletion(
      DEBRIEF_SYSTEM_PROMPT,
      buildDebriefUserPrompt(ctx),
      2_500,
      this.model,
      0.3 // session scores must be stable across regenerations
    );
    const parsed = parseDebrief(raw);
    return {
      ...parsed,
      strongestAnswer: parsed.strongestAnswer ?? {
        question: "(not identified)",
        why: "No single answer stood out as clearly strongest in this session.",
      },
      weakestAnswer: parsed.weakestAnswer ?? {
        question: "(not identified)",
        why: "No single answer stood out as clearly weakest in this session.",
      },
      provider: this.name,
      model: this.model,
    };
  }
}
