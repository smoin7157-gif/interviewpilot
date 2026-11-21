import { sanitizeAiLogMessage } from "@/lib/ai/safe-log";

export type OpsOutcome = "ok" | "error" | "degraded";

export interface OpsLogEvent {
  operation: string;
  outcome: OpsOutcome;
  durationMs?: number;
  userId?: string;
  requestId?: string;
  errorType?: string;
  provider?: string;
  /** Sanitized detail — never raw resume/JD/answer text. */
  detail?: string;
}

const FORBIDDEN_LOG_KEYS = /resume|jobdescription|password|bearer|authorization|secret|token/i;

function safeDetail(detail?: string): string | undefined {
  if (!detail) return undefined;
  const clean = sanitizeAiLogMessage(detail);
  if (FORBIDDEN_LOG_KEYS.test(clean)) return "[redacted]";
  return clean;
}

/** Single-line JSON log for grep-friendly production diagnostics. */
export function logOperation(event: OpsLogEvent): void {
  const payload: OpsLogEvent = {
    ...event,
    detail: safeDetail(event.detail),
  };
  const line = JSON.stringify(payload);
  if (event.outcome === "error") console.error("[ops]", line);
  else console.info("[ops]", line);
}

export async function withOpsTiming<T>(
  operation: string,
  fn: () => Promise<T>,
  meta?: Pick<OpsLogEvent, "userId" | "requestId" | "provider">
): Promise<T> {
  const started = Date.now();
  try {
    const result = await fn();
    logOperation({
      operation,
      outcome: "ok",
      durationMs: Date.now() - started,
      ...meta,
    });
    return result;
  } catch (err) {
    logOperation({
      operation,
      outcome: "error",
      durationMs: Date.now() - started,
      errorType: err instanceof Error ? err.name : "Error",
      detail: err instanceof Error ? err.message : String(err),
      ...meta,
    });
    throw err;
  }
}