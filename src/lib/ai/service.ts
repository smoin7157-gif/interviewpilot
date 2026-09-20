import { FallbackProvider } from "./fallback";
import { OpenRouterProvider } from "./openrouter";
import type { ResumeData } from "@/lib/candidate-context";
import type {
  AIProvider,
  DebriefContext,
  DebriefResult,
  EvaluationContext,
  EvaluationResult,
  FollowUpContext,
  GenerationContext,
  GenerationResult,
  InterviewerContext,
  InterviewerResult,
} from "./types";

/**
 * Single entry point for AI work. Picks the best available provider:
 * OpenRouter when a key is configured, otherwise the deterministic fallback.
 * If the AI call fails or produces invalid output, one controlled retry is
 * attempted, then the app degrades to the fallback provider so the flow
 * never dead-ends for the user.
 */

function hasApiKey(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export function isAiConfigured(): boolean {
  return hasApiKey();
}

function createBestProvider(): AIProvider {
  if (hasApiKey()) {
    try {
      return new OpenRouterProvider();
    } catch {
      // fall through to fallback
    }
  }
  return new FallbackProvider();
}

const RETRYABLE_MESSAGES = ["429", "5", "timed out", "timeout", "ECONNRESET", "fetch failed"];

function isRetryable(message: string): boolean {
  return RETRYABLE_MESSAGES.some((token) => message.includes(token));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run `task` once; on a transient failure (rate limit, 5xx, network) wait and
 * try once more before giving up. Returns null when every attempt fails so
 * the caller can degrade to the fallback provider.
 */
async function withRetry<T>(task: () => Promise<T>, label: string): Promise<T | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await task();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ai] ${label} attempt ${attempt} failed: ${message}`);
      if (attempt === 2 || !isRetryable(message)) return null;
      await sleep(1_500 * attempt); // backoff before the retry
    }
  }
  return null; // unreachable
}

export async function generateQuestions(ctx: GenerationContext): Promise<GenerationResult> {
  const primary = createBestProvider();
  if (primary instanceof OpenRouterProvider) {
    const questions = await withRetry(() => primary.generateQuestions(ctx), "question generation");
    if (questions && questions.length > 0) {
      return { questions, provider: primary.name, model: primary.model };
    }
  }

  // Deterministic fallback keeps the product usable even when the AI is down.
  const fallback = new FallbackProvider();
  const questions = await fallback.generateQuestions(ctx);
  return { questions, provider: fallback.name };
}

export async function generateFollowUps(ctx: FollowUpContext): Promise<{ followUps: string[]; provider: string; model?: string }> {
  const primary = createBestProvider();
  if (primary instanceof OpenRouterProvider) {
    const followUps = await withRetry(() => primary.generateFollowUps(ctx), "follow-up generation");
    if (followUps) {
      return { followUps, provider: primary.name, model: primary.model };
    }
  }
  const fallback = new FallbackProvider();
  const followUps = await fallback.generateFollowUps(ctx);
  return { followUps, provider: fallback.name };
}

export async function evaluateAnswer(ctx: EvaluationContext): Promise<{ result: EvaluationResult; provider: string; model?: string }> {
  const primary = createBestProvider();
  if (primary instanceof OpenRouterProvider) {
    const result = await withRetry(() => primary.evaluateAnswer(ctx), "answer evaluation");
    if (result) {
      return { result, provider: primary.name, model: primary.model };
    }
  }
  const fallback = new FallbackProvider();
  const result = await fallback.evaluateAnswer(ctx);
  return { result, provider: fallback.name };
}

export async function extractResumeData(
  text: string
): Promise<{ result: ResumeData; provider: string; model?: string }> {
  const primary = createBestProvider();
  if (primary instanceof OpenRouterProvider) {
    const result = await withRetry(() => primary.extractResume(text), "resume extraction");
    if (result) {
      return { result, provider: primary.name, model: primary.model };
    }
  }
  const fallback = new FallbackProvider();
  const result = await fallback.extractResume(text);
  return { result, provider: fallback.name };
}

export async function driveInterview(ctx: InterviewerContext): Promise<InterviewerResult> {
  const primary = createBestProvider();
  if (primary instanceof OpenRouterProvider) {
    const decision = await withRetry(() => primary.driveInterview(ctx), "interviewer decision");
    if (decision) {
      return { decision, provider: primary.name, model: primary.model };
    }
  }
  const fallback = new FallbackProvider();
  const decision = await fallback.driveInterview(ctx);
  return { decision, provider: fallback.name };
}

export async function generateDebrief(ctx: DebriefContext): Promise<{ result: DebriefResult; provider: string; model?: string }> {
  const primary = createBestProvider();
  if (primary instanceof OpenRouterProvider) {
    const result = await withRetry(() => primary.generateDebrief(ctx), "debrief generation");
    if (result) {
      return { result, provider: primary.name, model: primary.model };
    }
  }
  const fallback = new FallbackProvider();
  const result = await fallback.generateDebrief(ctx);
  return { result, provider: fallback.name };
}
