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
import { siteUrl } from "@/lib/env";
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

/** Shorter ceilings on fast paths so a hung call fails over to fallback sooner. */
const REQUEST_TIMEOUT_MS = {
  generation: 120_000,
  followUp: 90_000,
  scoring: 90_000,
  extraction: 75_000,
  interviewer: 60_000,
  debrief: 120_000,
} as const;

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
    temperature = 0.7,
    timeoutMs = REQUEST_TIMEOUT_MS.generation
  ): Promise<string> {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
        "HTTP-Referer": siteUrl(),
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
      signal: timeoutSignal(timeoutMs),
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

  /**
   * One structured completion, with a single corrective retry.
   *
   * A model that answers with prose, a truncated object, or a renamed field is
   * one hint away from a valid answer — discarding the whole call and sending
   * the candidate to the deterministic bank wastes the request and loses the
   * personalisation that was just paid for. The validator's own message is
   * fed back verbatim so the second attempt knows exactly what was wrong.
   *
   * Only *validation* failures retry here: HTTP/transport failures still throw
   * from `chatCompletion` and stay under the service layer's retry policy (a
   * permanent 400 must not become two paid rejections).
   */
  private async structuredCompletion<T>(
    params: {
      system: string;
      user: string;
      maxTokens: number;
      model?: string;
      temperature: number;
      timeoutMs?: number;
    },
    parse: (raw: string) => T
  ): Promise<T> {
    const timeoutMs = params.timeoutMs ?? REQUEST_TIMEOUT_MS.generation;
    const raw = await this.chatCompletion(
      params.system,
      params.user,
      params.maxTokens,
      params.model ?? this.model,
      params.temperature,
      timeoutMs
    );
    try {
      return parse(raw);
    } catch (err) {
      const problem = err instanceof Error ? err.message : String(err);
      console.warn(`[ai] openrouter output failed validation, asking once more: ${problem}`);
      const repairSystem =
        `${params.system}\n\n` +
        `IMPORTANT: your previous reply was rejected by the response validator: ${problem}\n` +
        `Reply again with ONLY the corrected JSON object in the exact shape described — no markdown, no commentary.`;
      const retried = await this.chatCompletion(
        repairSystem,
        params.user,
        params.maxTokens,
        params.model ?? this.model,
        params.temperature,
        timeoutMs
      );
      try {
        return parse(retried);
      } catch (repairErr) {
        const detail = repairErr instanceof Error ? repairErr.message : String(repairErr);
        throw new Error(`OpenRouter repair completion failed validation: ${detail}`);
      }
    }
  }

  async generateQuestions(ctx: GenerationContext): Promise<GeneratedQuestion[]> {
    return this.structuredCompletion(
      {
        system: GENERATION_SYSTEM_PROMPT,
        user: buildGenerationUserPrompt(ctx),
        maxTokens: generationTokenBudget(ctx.count),
        model: this.model, // full model: candidate-facing generation
        temperature: TEMPERATURE.generation,
        timeoutMs: REQUEST_TIMEOUT_MS.generation,
      },
      // Model drift or a saturated bank can still repeat a practiced question —
      // enforce the avoid-list server-side so repeat sessions stay fresh.
      (raw) => filterAvoidList(parseQuestions(raw), ctx.avoidQuestions ?? [])
    );
  }

  async generateFollowUps(ctx: FollowUpContext): Promise<string[]> {
    return this.structuredCompletion(
      {
        system: FOLLOWUP_SYSTEM_PROMPT,
        user: buildFollowUpUserPrompt(ctx),
        maxTokens: 2_000,
        model: this.model, // full model: candidate-facing generation
        temperature: TEMPERATURE.followUp,
        timeoutMs: REQUEST_TIMEOUT_MS.followUp,
      },
      parseFollowUps
    );
  }

  async evaluateAnswer(ctx: EvaluationContext): Promise<EvaluationResult> {
    return this.structuredCompletion(
      {
        system: EVALUATION_SYSTEM_PROMPT,
        user: buildEvaluationUserPrompt(ctx),
        maxTokens: 2_000,
        model: this.model, // full model: scoring quality drives the calibration promise
        temperature: TEMPERATURE.scoring, // scoring must be consistent, not creative
        timeoutMs: REQUEST_TIMEOUT_MS.scoring,
      },
      parseEvaluation
    );
  }

  async extractResume(text: string): Promise<ResumeData> {
    return this.structuredCompletion(
      {
        system: RESUME_EXTRACTION_SYSTEM_PROMPT,
        user: buildResumeExtractionUserPrompt(text),
        maxTokens: 3_000,
        model: CHEAP_MODEL, // cheap model: bulk extraction only
        temperature: TEMPERATURE.extraction, // extraction must be deterministic
        timeoutMs: REQUEST_TIMEOUT_MS.extraction,
      },
      parseResume
    );
  }

  async driveInterview(ctx: InterviewerContext): Promise<InterviewerDecision> {
    return this.structuredCompletion(
      {
        system: INTERVIEWER_SYSTEM_PROMPT,
        user: buildInterviewerUserPrompt(ctx),
        maxTokens: 700,
        model: this.model, // full model: live interviewing
        temperature: TEMPERATURE.interviewer, // moderate-low: natural, never erratic
        timeoutMs: REQUEST_TIMEOUT_MS.interviewer,
      },
      parseInterviewerDecision
    );
  }

  async generateDebrief(ctx: DebriefContext): Promise<DebriefResult> {
    const parsed = await this.structuredCompletion(
      {
        system: DEBRIEF_SYSTEM_PROMPT,
        user: buildDebriefUserPrompt(ctx),
        maxTokens: 2_500,
        model: this.model, // full model: candidate-facing debrief
        temperature: TEMPERATURE.debrief, // session scores must be stable across regenerations
        timeoutMs: REQUEST_TIMEOUT_MS.debrief,
      },
      parseDebrief
    );
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
