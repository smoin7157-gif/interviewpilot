import { FallbackProvider } from "./fallback";
import { OpenRouterProvider } from "./openrouter";
import type { ResumeData } from "@/lib/candidate-context";
import type {
  AIProvider,
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

export async function generateQuestions(ctx: GenerationContext): Promise<GenerationResult> {
  const primary = createBestProvider();
  const attempts: Array<() => Promise<unknown>> = [];

  if (primary instanceof OpenRouterProvider) {
    attempts.push(() => primary.generateQuestions(ctx));
  }

  // A corrective second pass if the model output was malformed.
  for (const attempt of attempts) {
    try {
      const questions = await attempt();
      if (Array.isArray(questions) && questions.length > 0) {
        return { questions, provider: primary.name, model: primary.model };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ai] question generation attempt failed: ${message}`);
      if (!isRetryable(message)) break;
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
    try {
      const followUps = await primary.generateFollowUps(ctx);
      return { followUps, provider: primary.name, model: primary.model };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ai] follow-up generation failed: ${message}`);
      if (!isRetryable(message)) {
        // fall through to fallback
      }
    }
  }
  const fallback = new FallbackProvider();
  const followUps = await fallback.generateFollowUps(ctx);
  return { followUps, provider: fallback.name };
}

export async function evaluateAnswer(ctx: EvaluationContext): Promise<{ result: EvaluationResult; provider: string; model?: string }> {
  const primary = createBestProvider();
  if (primary instanceof OpenRouterProvider) {
    try {
      const result = await primary.evaluateAnswer(ctx);
      return { result, provider: primary.name, model: primary.model };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ai] answer evaluation failed: ${message}`);
      if (!isRetryable(message)) {
        // fall through to fallback
      }
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
    try {
      const result = await primary.extractResume(text);
      return { result, provider: primary.name, model: primary.model };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ai] resume extraction failed: ${message}`);
      // fall through to the deterministic extractor
    }
  }
  const fallback = new FallbackProvider();
  const result = await fallback.extractResume(text);
  return { result, provider: fallback.name };
}

export async function driveInterview(ctx: InterviewerContext): Promise<InterviewerResult> {
  const primary = createBestProvider();
  if (primary instanceof OpenRouterProvider) {
    try {
      const decision = await primary.driveInterview(ctx);
      return { decision, provider: primary.name, model: primary.model };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ai] interviewer decision failed: ${message}`);
      if (!isRetryable(message)) {
        // fall through to the deterministic interviewer
      }
    }
  }
  const fallback = new FallbackProvider();
  const decision = await fallback.driveInterview(ctx);
  return { decision, provider: fallback.name };
}
