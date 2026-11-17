import { clampSuggestedAnswerToSource } from "./answer-grounding";
import type { GeneratedQuestion, GenerationContext } from "./types";

function groundingCorpus(ctx: Pick<GenerationContext, "jobDescription" | "candidateContext" | "role" | "company">): string {
  return [ctx.jobDescription, ctx.candidateContext, ctx.role, ctx.company]
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .join("\n");
}

/** Ground model-generated suggested answers in the candidate's own context text. */
export function groundGeneratedQuestions(questions: GeneratedQuestion[], ctx: GenerationContext): GeneratedQuestion[] {
  const corpus = groundingCorpus(ctx);
  if (!corpus.trim()) return questions;
  return questions.map((q) => ({
    ...q,
    suggested_answer: clampSuggestedAnswerToSource(q.suggested_answer, corpus),
  }));
}