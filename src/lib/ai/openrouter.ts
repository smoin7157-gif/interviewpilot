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
  filterAvoidList,
  parseDebrief,
  parseEvaluation,
  parseFollowUps,
  parseInterviewerDecision,
  parseQuestions,
  parseResume,
} from "./validate";

const DEFAULT_MODEL = "openai/gpt-4o";

/**
 * Model routing by task cost. There are exactly two tiers:
 *  - CHEAP_MODEL: bulk EXTRACTION only (resume parsing). Low-stakes and
 *    high-volume, so cheaper is a real saving with no quality loss.
 *  - this.model: everything the candidate experiences — question generation,
 *    answer scoring, live interviewing, and the debrief.
 */
const CHEAP_MODEL = process.env.OPENROUTER_CHEAP_MODEL?.trim() || "openai/gpt-4o-mini";

/**
 * Temperature by task type (consistency vs. variety):
 *  - extraction/scoring/debrief: low, so identical inputs score identically.
 *  - generation/follow-ups: moderate, so repeat sessions feel fresh.
 *  - interviewer: moderate-low — a natural live interviewer, not an erratic one.
 */
const TEMPERATURE = {
  generation: 0.8,
  followUp: 0.7,
  scoring: 0.1,
  extraction: 0.1,
  interviewer: 0.4,
  debrief: 0.2,
} as const;
const BASE_URL = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
const API_KEY = process.env.OPENROUTER_API_KEY;

function timeoutSignal(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

// Hard ceiling for completion output. Must stay within every model's output
// cap (gpt-4o-mini: 16,384) — a larger request makes OpenRouter reject the
// whole call, which silently degrades every live AI feature to fallback.
const MAX_COMPLETION_TOKENS = 16_000;

/**
 * Output budget for question generation, scaled to the requested set size.
 *
 * Asking for the full 16k ceiling on every generation looks harmless, but
 * OpenRouter refuses a request whose `max_tokens` exceeds what the account can
 * currently afford (402 "requires more credits, or fewer max_tokens"). Because
 * generation is a single call, one oversized ask means live generation NEVER
 * runs and every candidate silently gets the offline bank — which is exactly
 * the kind of failure the provider fallback is meant to hide, not cause. A
 * question (with its answer and three follow-ups) needs roughly 250 output
 * tokens, so 500 per question leaves 2x headroom while staying affordable.
 */
const GENERATION_TOKENS_PER_QUESTION = 500;
const GENERATION_TOKENS_OVERHEAD = 500;

export function generationTokenBudget(questionCount: number): number {
  const count = Math.max(1, Math.floor(questionCount));
  return Math.min(
    MAX_COMPLETION_TOKENS,
    GENERATION_TOKENS_OVERHEAD + GENERATION_TOKENS_PER_QUESTION * count
  );
}

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
      generationTokenBudget(ctx.count),
      this.model, // full model: candidate-facing generation
      TEMPERATURE.generation
    );
    // Model drift or a saturated bank can still repeat a practiced question —
    // enforce the avoid-list server-side so repeat sessions stay fresh.
    return filterAvoidList(parseQuestions(raw), ctx.avoidQuestions ?? []);
  }

  async generateFollowUps(ctx: FollowUpContext): Promise<string[]> {
    const raw = await this.chatCompletion(
      FOLLOWUP_SYSTEM_PROMPT,
      buildFollowUpUserPrompt(ctx),
      2_000,
      this.model, // full model: candidate-facing generation
      TEMPERATURE.followUp
    );
    return parseFollowUps(raw);
  }

  async evaluateAnswer(ctx: EvaluationContext): Promise<EvaluationResult> {
    const raw = await this.chatCompletion(
      EVALUATION_SYSTEM_PROMPT,
      buildEvaluationUserPrompt(ctx),
      2_000,
      this.model, // full model: scoring quality drives the calibration promise
      TEMPERATURE.scoring // scoring must be consistent, not creative
    );
    return parseEvaluation(raw);
  }

  async extractResume(text: string): Promise<ResumeData> {
    const raw = await this.chatCompletion(
      RESUME_EXTRACTION_SYSTEM_PROMPT,
      buildResumeExtractionUserPrompt(text),
      3_000,
      CHEAP_MODEL, // cheap model: bulk extraction only
      TEMPERATURE.extraction // extraction must be deterministic
    );
    return parseResume(raw);
  }

  async driveInterview(ctx: InterviewerContext): Promise<InterviewerDecision> {
    const raw = await this.chatCompletion(
      INTERVIEWER_SYSTEM_PROMPT,
      buildInterviewerUserPrompt(ctx),
      700,
      this.model, // full model: live interviewing
      TEMPERATURE.interviewer // moderate-low: natural, never erratic
    );
    return parseInterviewerDecision(raw);
  }

  async generateDebrief(ctx: DebriefContext): Promise<DebriefResult> {
    const raw = await this.chatCompletion(
      DEBRIEF_SYSTEM_PROMPT,
      buildDebriefUserPrompt(ctx),
      2_500,
      this.model, // full model: candidate-facing debrief
      TEMPERATURE.debrief // session scores must be stable across regenerations
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
