import type { EvaluationContext, EvaluationResult } from "./types";

/**
 * Deterministic written-answer scoring used by the fallback provider.
 * Kept in one module so identical inputs always produce identical scores.
 */
export function evaluateAnswerHeuristically(ctx: EvaluationContext): EvaluationResult {
  const words = ctx.answer.trim().split(/\s+/).filter(Boolean).length;
  const hasExample = /\b(for example|for instance|in one case|specifically|such as)\b/i.test(ctx.answer);
  const hasResult = /\b(result|outcome|impact|improved|reduced|increased|shipped|launched)\b/i.test(ctx.answer);
  const isStructured = /\b(first|then|finally|after|next)\b/i.test(ctx.answer);

  let score = 45;
  if (words >= 40) score += 15;
  if (words >= 80) score += 10;
  if (hasExample) score += 15;
  if (hasResult) score += 10;
  if (isStructured) score += 5;
  score = Math.min(95, score);

  const strengths: string[] = [];
  if (hasExample) strengths.push("You grounded the answer in a concrete example");
  if (isStructured) strengths.push("The answer follows a clear, logical structure");
  if (words >= 60) strengths.push("You gave enough detail to be convincing");
  if (strengths.length === 0) strengths.push("You addressed the question directly");

  const missing: string[] = [];
  if (!hasResult) missing.push("No measurable result or outcome — state what changed because of your actions");
  if (!isStructured) missing.push("Could follow a clearer structure (start with the situation, end with the result)");
  if (!hasExample) missing.push("An example would make this far more believable than general statements");
  if (words < 60) missing.push("The answer is thin — expand with specifics about your role and actions");

  const improvements = [
    `Open with a one-sentence direct answer to "${ctx.prompt}" before adding detail`,
    "Use the STAR pattern: Situation, Task, Action, Result",
    "Close by connecting back to why this matters for the role you are interviewing for",
  ];

  return { score, strengths, missing, improvements };
}