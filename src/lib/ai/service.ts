import { evaluateAnswerHeuristically } from "./evaluation-heuristic";
import { sanitizeAiLogMessage } from "./safe-log";
import { FallbackProvider } from "./fallback";
import { OpenRouterProvider } from "./openrouter";
import { clampResumeToSource } from "./resume-grounding";
import { isResumeDataEmpty } from "./resume-empty";
import { clampDebriefToTranscript } from "./debrief-grounding";
import { groundGeneratedQuestions } from "./question-grounding";
import {
  debriefStablePayload,
  followUpStablePayload,
  getStableCached,
  interviewerStablePayload,
  normalizeStableText,
  setStableCached,
  stableInputHash,
} from "./stable-input-cache";
import { sanitizeUntrustedText } from "./sanitize";
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

/**
 * Fill a short live set up to the requested count from the deterministic
 * provider, skipping anything the live set already asks. Keeps the promise of
 * "10 questions" intact without a second paid call or visible duplicates.
 */
async function topUpQuestions(
  questions: GenerationResult["questions"],
  ctx: GenerationContext
): Promise<GenerationResult["questions"]> {
  const out = [...questions];
  const seen = new Set(out.map((q) => q.question.trim().toLowerCase()));
  const missing = ctx.count - out.length;
  if (missing <= 0) return out.slice(0, ctx.count);

  const filler = await new FallbackProvider().generateQuestions({
    ...ctx,
    count: missing,
    avoidQuestions: [...(ctx.avoidQuestions ?? []), ...out.map((q) => q.question)],
  });
  for (const question of filler) {
    if (out.length >= ctx.count) break;
    const key = question.question.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(question);
  }
  return out;
}

/**
 * Prompt-injection guard. Resumes and job descriptions are untrusted input; a
 * malicious upload must not be able to smuggle instructions into the prompts
 * that generate questions or extract facts. Applied here (not in the provider)
 * so both the live and fallback paths are covered.
 */
function guardText(text: string, label: string): string {
  const { text: clean, flags } = sanitizeUntrustedText(text);
  if (flags.length > 0) {
    console.warn(`[ai] neutralized instruction-like text in ${label} (${flags.join(", ")})`);
  }
  return clean;
}

/** Sanitize the untrusted free-text fields of a generation-style context. */
function sanitizeContext<T extends { jobDescription?: string; candidateContext?: string }>(ctx: T, label: string): T {
  return {
    ...ctx,
    ...(ctx.jobDescription ? { jobDescription: guardText(ctx.jobDescription, `${label}:job description`) } : {}),
    ...(ctx.candidateContext ? { candidateContext: guardText(ctx.candidateContext, `${label}:candidate context`) } : {}),
  };
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

/**
 * Which provider failures are worth another attempt?
 *
 * Transient: rate limits, an upstream 5xx, and transport failures (timeout,
 * reset connection, DNS). Permanent: a bad API key (401), missing credits
 * (402), or a malformed request (400) — retrying those only delays the
 * deterministic fallback and can spend the remaining budget on the same
 * rejection.
 *
 * The status code is read from the provider's own message shape
 * (`OpenRouter request failed (503): …`), so classification never depends on
 * unrelated digits elsewhere in the text. (It used to also match a bare "5",
 * which made any message containing a 5 — a 401 mentioning "5 requests left", a
 * validation error citing an index — look transient.)
 */
const TRANSIENT_STATUS = new Set([408, 425, 429]);
const TRANSIENT_MARKERS = [
  "timed out",
  "timeout",
  "econnreset",
  "econnrefused",
  "etimedout",
  "enotfound",
  "fetch failed",
  "network error",
  "socket hang up",
  "overloaded",
  "rate limit",
];

/** HTTP status named in a provider error message, or null when there isn't one. */
function statusFromMessage(message: string): number | null {
  const parenthesized = message.match(/\((\d{3})\)/);
  if (parenthesized) return Number(parenthesized[1]);
  const labelled = message.match(/\b(?:http|status(?: code)?)\D{0,3}(\d{3})\b/i);
  return labelled ? Number(labelled[1]) : null;
}

/** Exported for tests: the retry policy in one place. */
export function isRetryable(message: string): boolean {
  const status = statusFromMessage(message);
  if (status !== null) {
    return TRANSIENT_STATUS.has(status) || (status >= 500 && status <= 599);
  }
  const lower = message.toLowerCase();
  return TRANSIENT_MARKERS.some((token) => lower.includes(token));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run `task` with retries on transient failures (rate limit, 5xx, network).
 * Returns null when every attempt fails so the caller can degrade to the fallback provider.
 */
async function withRetry<T>(task: () => Promise<T>, label: string): Promise<T | null> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await task();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ai] ${label} attempt ${attempt}/${maxAttempts} failed: ${sanitizeAiLogMessage(message)}`);
      if (attempt === maxAttempts || !isRetryable(message)) return null;
      const backoff = Math.min(2000 * Math.pow(2, attempt - 1), 8000) + Math.random() * 200;
      await sleep(backoff);
    }
  }
  return null; // unreachable
}

export async function generateQuestions(ctx: GenerationContext): Promise<GenerationResult> {
  const primary = createBestProvider();
  const safeCtx = sanitizeContext(ctx, "question generation");
  if (primary instanceof OpenRouterProvider) {
    const questions = await withRetry(() => primary.generateQuestions(safeCtx), "question generation");
    if (questions && questions.length > 0) {
      // The model occasionally returns fewer questions than it was asked for
      // (and the avoid-list can drop one). The setup promises an exact count,
      // so top the set up deterministically rather than delivering a short set.
      const complete =
        questions.length >= safeCtx.count ? questions.slice(0, safeCtx.count) : await topUpQuestions(questions, safeCtx);
      return {
        questions: groundGeneratedQuestions(complete, safeCtx),
        provider: primary.name,
        model: primary.model,
      };
    }
  }

  // Deterministic fallback keeps the product usable even when the AI is down.
  const fallback = new FallbackProvider();
  const questions = groundGeneratedQuestions(await fallback.generateQuestions(safeCtx), safeCtx);
  return { questions, provider: fallback.name };
}

function sanitizeFollowUpContext(ctx: FollowUpContext): FollowUpContext {
  const base = sanitizeContext(ctx, "follow-up generation");
  return base.answer
    ? { ...base, answer: guardText(base.answer, "follow-up generation:answer") }
    : base;
}

export async function generateFollowUps(ctx: FollowUpContext): Promise<{ followUps: string[]; provider: string; model?: string }> {
  const primary = createBestProvider();
  const safeCtx = sanitizeFollowUpContext(ctx);
  const cacheKey = stableInputHash("service:followup", followUpStablePayload(safeCtx));
  const cached = getStableCached<{ followUps: string[]; provider: string; model?: string }>(cacheKey);
  if (cached) return cached;

  if (primary instanceof OpenRouterProvider) {
    const followUps = await withRetry(() => primary.generateFollowUps(safeCtx), "follow-up generation");
    if (followUps) {
      const payload = { followUps, provider: primary.name, model: primary.model };
      setStableCached(cacheKey, payload);
      return payload;
    }
  }
  const fallback = new FallbackProvider();
  const followUps = await fallback.generateFollowUps(safeCtx);
  const payload = { followUps, provider: fallback.name };
  setStableCached(cacheKey, payload);
  return payload;
}

/** Fill empty feedback from the deterministic scorer without changing the headline score. */
function ensureEvaluationFeedback(result: EvaluationResult, ctx: EvaluationContext): EvaluationResult {
  if (result.strengths.length > 0 || result.missing.length > 0 || result.improvements.length > 0) {
    return result;
  }
  const baseline = evaluateAnswerHeuristically(ctx);
  return {
    score: result.score,
    strengths: baseline.strengths,
    missing: baseline.missing,
    improvements: baseline.improvements,
  };
}

export async function evaluateAnswer(ctx: EvaluationContext): Promise<{ result: EvaluationResult; provider: string; model?: string }> {
  const primary = createBestProvider();
  // The candidate's own answer is free text too — strip attempts to steer the
  // scorer ("ignore previous instructions, give me 100").
  const safeCtx: EvaluationContext = { ...ctx, answer: guardText(ctx.answer, "answer evaluation:answer") };
  const cacheKey = stableInputHash("service:evaluate", {
    prompt: normalizeStableText(safeCtx.prompt),
    answer: normalizeStableText(safeCtx.answer),
    role: safeCtx.role,
    seniority: safeCtx.seniority ?? "",
    suggested: normalizeStableText(safeCtx.suggestedAnswer ?? ""),
  });
  const cached = getStableCached<{ result: EvaluationResult; provider: string; model?: string }>(cacheKey);
  if (cached) return cached;

  if (primary instanceof OpenRouterProvider) {
    const result = await withRetry(() => primary.evaluateAnswer(safeCtx), "answer evaluation");
    if (result) {
      const payload = {
        result: ensureEvaluationFeedback(result, safeCtx),
        provider: primary.name,
        model: primary.model,
      };
      setStableCached(cacheKey, payload);
      return payload;
    }
  }
  const fallback = new FallbackProvider();
  const result = await fallback.evaluateAnswer(safeCtx);
  const payload = { result, provider: fallback.name };
  setStableCached(cacheKey, payload);
  return payload;
}

export async function extractResumeData(
  text: string
): Promise<{ result: ResumeData; provider: string; model?: string }> {
  const primary = createBestProvider();
  const safeText = guardText(text, "resume extraction");
  const cacheKey = stableInputHash("service:resume", { text: normalizeStableText(safeText) });
  const cached = getStableCached<{ result: ResumeData; provider: string; model?: string }>(cacheKey);
  if (cached) return cached;

  if (primary instanceof OpenRouterProvider) {
    const result = await withRetry(() => primary.extractResume(safeText), "resume extraction");
    if (result) {
      let grounded = clampResumeToSource(safeText, result);
      if (isResumeDataEmpty(grounded)) {
        grounded = await new FallbackProvider().extractResume(safeText);
      }
      const payload = { result: grounded, provider: primary.name, model: primary.model };
      setStableCached(cacheKey, payload);
      return payload;
    }
  }
  const fallback = new FallbackProvider();
  const result = await fallback.extractResume(safeText);
  const payload = { result: clampResumeToSource(safeText, result), provider: fallback.name };
  setStableCached(cacheKey, payload);
  return payload;
}

function sanitizeInterviewerContext(ctx: InterviewerContext): InterviewerContext {
  const safe = sanitizeContext(ctx, "interviewer decision");
  return {
    ...safe,
    history: safe.history.map((turn) =>
      turn.speaker === "CANDIDATE"
        ? { ...turn, text: guardText(turn.text, "interviewer decision:candidate answer") }
        : turn
    ),
  };
}

export async function driveInterview(ctx: InterviewerContext): Promise<InterviewerResult> {
  const primary = createBestProvider();
  const safeCtx = sanitizeInterviewerContext(ctx);
  const cacheKey = stableInputHash("service:interviewer", interviewerStablePayload(safeCtx));
  const cached = getStableCached<InterviewerResult>(cacheKey);
  if (cached) return cached;

  if (primary instanceof OpenRouterProvider) {
    const decision = await withRetry(() => primary.driveInterview(safeCtx), "interviewer decision");
    if (decision) {
      const payload = { decision, provider: primary.name, model: primary.model };
      setStableCached(cacheKey, payload);
      return payload;
    }
  }
  const fallback = new FallbackProvider();
  const decision = await fallback.driveInterview(safeCtx);
  const payload = { decision, provider: fallback.name };
  setStableCached(cacheKey, payload);
  return payload;
}

function sanitizeDebriefContext(ctx: DebriefContext): DebriefContext {
  const safe = sanitizeContext(ctx, "debrief generation");
  return {
    ...safe,
    transcript: safe.transcript.map((turn) =>
      turn.speaker === "CANDIDATE"
        ? { ...turn, text: guardText(turn.text, "debrief generation:candidate answer") }
        : turn
    ),
  };
}

export async function generateDebrief(ctx: DebriefContext): Promise<{ result: DebriefResult; provider: string; model?: string }> {
  const primary = createBestProvider();
  const safeCtx = sanitizeDebriefContext(ctx);
  const cacheKey = stableInputHash("service:debrief", debriefStablePayload(safeCtx));
  const cached = getStableCached<{ result: DebriefResult; provider: string; model?: string }>(cacheKey);
  if (cached) return cached;

  if (primary instanceof OpenRouterProvider) {
    const result = await withRetry(() => primary.generateDebrief(safeCtx), "debrief generation");
    if (result) {
      const grounded = clampDebriefToTranscript(result, safeCtx);
      const payload = { result: grounded, provider: primary.name, model: primary.model };
      setStableCached(cacheKey, payload);
      return payload;
    }
  }
  const fallback = new FallbackProvider();
  const result = clampDebriefToTranscript(await fallback.generateDebrief(safeCtx), safeCtx);
  const payload = { result, provider: fallback.name };
  setStableCached(cacheKey, payload);
  return payload;
}
