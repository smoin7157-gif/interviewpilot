import { claimSupportedInSource } from "./resume-grounding";

const PLACEHOLDER =
  /\[(?:context|reason|trade-off|measurable result|situation|task|action|result|project|company)\]/i;

const COACHING_PHRASE =
  /\b(star pattern|for example|the situation was|the outcome was|one-sentence|speakable|direct answer)\b/i;

/** Lines that are coaching scaffolding, not factual resume/JD claims. */
function isCoachingScaffold(sentence: string): boolean {
  const trimmed = sentence.trim();
  if (trimmed.length < 12) return true;
  if (PLACEHOLDER.test(trimmed)) return true;
  if (COACHING_PHRASE.test(trimmed)) return true;
  return false;
}

/**
 * Drop suggested-answer sentences that invent employers, products, or metrics
 * not present in the candidate's job description or resume context.
 */
export function clampSuggestedAnswerToSource(suggestedAnswer: string, sourceText: string): string {
  const source = sourceText.trim();
  if (!source) return suggestedAnswer.trim();

  const sentences = suggestedAnswer
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const kept = sentences.filter(
    (s) => isCoachingScaffold(s) || claimSupportedInSource(s, source)
  );

  if (kept.length === 0) {
    return "Open with a direct answer, then walk through situation, action, and a measurable result drawn from your own experience.";
  }
  return kept.join(" ");
}