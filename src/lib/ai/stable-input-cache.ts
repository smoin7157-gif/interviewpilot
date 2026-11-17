import { createHash } from "node:crypto";
import type { DebriefContext, FollowUpContext, InterviewerContext } from "./types";

const MAX_ENTRIES = 128;
const TTL_MS = 10 * 60 * 1000;

type CacheEntry<T> = { value: T; expiresAt: number };

const store = new Map<string, CacheEntry<unknown>>();

/** Collapse whitespace so incidental spacing does not bust cache keys. */
export function normalizeStableText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function stableInputHash(namespace: string, payload: unknown): string {
  const body = JSON.stringify(payload);
  return createHash("sha256").update(namespace).update("\0").update(body).digest("hex");
}

/** Derive an OpenAI-compatible seed from a stable hash (scoring / extraction). */
export function seedFromStableHash(hashHex: string): number {
  return Number.parseInt(hashHex.slice(0, 8), 16) & 0x7fffffff;
}

export function getStableCached<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function setStableCached<T>(key: string, value: T): void {
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

export function interviewerStablePayload(ctx: InterviewerContext): unknown {
  return {
    role: ctx.role,
    seniority: ctx.seniority,
    company: ctx.company ?? "",
    companyType: ctx.companyType ?? "",
    interviewType: ctx.interviewType ?? "",
    questionsAsked: ctx.questionsAsked,
    maxQuestions: ctx.maxQuestions,
    jobDescription: normalizeStableText(ctx.jobDescription ?? ""),
    candidateContext: normalizeStableText(ctx.candidateContext ?? ""),
    history: ctx.history.map((t) => ({
      speaker: t.speaker,
      text: normalizeStableText(t.text),
    })),
    questionBank: ctx.questionBank.map((q) => ({
      question: normalizeStableText(q.question),
      category: q.category,
      difficulty: q.difficulty,
    })),
  };
}

export function followUpStablePayload(ctx: FollowUpContext): unknown {
  return {
    question: normalizeStableText(ctx.question),
    role: ctx.role,
    seniority: ctx.seniority,
    company: ctx.company ?? "",
    companyType: ctx.companyType ?? "",
    interviewType: ctx.interviewType ?? "",
    jobDescription: normalizeStableText(ctx.jobDescription ?? ""),
    answer: normalizeStableText(ctx.answer ?? ""),
  };
}

/** Normalized debrief inputs for hashing — identical transcripts → identical keys. */
export function debriefStablePayload(ctx: DebriefContext): unknown {
  return {
    role: ctx.role,
    seniority: ctx.seniority,
    company: ctx.company ?? "",
    companyType: ctx.companyType ?? "",
    interviewType: ctx.interviewType ?? "",
    jobDescription: normalizeStableText(ctx.jobDescription ?? ""),
    candidateContext: normalizeStableText(ctx.candidateContext ?? ""),
    maxQuestions: ctx.maxQuestions,
    transcript: ctx.transcript.map((t) => ({
      speaker: t.speaker,
      text: normalizeStableText(t.text),
    })),
  };
}

/** @internal tests only */
export function clearStableInputCache(): void {
  store.clear();
}