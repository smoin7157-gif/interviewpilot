const MAX_AI_LOG_CHARS = 240;

/**
 * Redact free-text from AI failure logs so resumes, answers, and JD paste
 * never land in server logs. Status lines and validator messages are kept
 * (they are shaped by our code, not raw user input).
 */
export function sanitizeAiLogMessage(message: string): string {
  const oneLine = message.replace(/[\r\n]+/g, " ").trim();
  if (oneLine.length <= MAX_AI_LOG_CHARS) return oneLine;
  return `${oneLine.slice(0, MAX_AI_LOG_CHARS)}…`;
}