import { logOperation } from "@/lib/ops-log";

export type AiCacheOperation = "evaluate" | "resume" | "follow-up" | "debrief" | "interviewer";

/** Non-PII signal for cache effectiveness and model call avoidance. */
export function logAiCacheAccess(operation: AiCacheOperation, hit: boolean, provider?: string): void {
  logOperation({
    operation: `ai-cache:${operation}`,
    outcome: "ok",
    provider,
    detail: hit ? "cache_hit" : "cache_miss",
  });
}

export function logAiSkippedLiveModel(operation: AiCacheOperation, reason: string): void {
  logOperation({
    operation: `ai-skip:${operation}`,
    outcome: "degraded",
    detail: reason,
  });
}