import { z } from "zod";
import { CATEGORIES } from "@/lib/validation";
import type { GeneratedQuestion, QuestionCategory, QuestionDifficulty } from "./types";

const categoryValues = CATEGORIES as readonly string[];

function normalizeCategory(raw: string): QuestionCategory {
  const value = raw.trim().toLowerCase();
  const match = categoryValues.find((c) => value.includes(c.toLowerCase()));
  if (match) return match as QuestionCategory;
  if (value.includes("role")) return "Role-specific";
  if (value.includes("project")) return "Project";
  if (value.includes("behavior") || value.includes("behaviour") || value.includes("cultural")) return "Behavioral";
  if (value.includes("general") || value.includes("opening") || value.includes("introduction")) return "General";
  return "Technical";
}

function normalizeDifficulty(raw: string): QuestionDifficulty {
  const value = raw.trim().toLowerCase();
  if (value.includes("easy") || value.includes("junior") || value.includes("entry")) return "Easy";
  if (value.includes("hard") || value.includes("senior") || value.includes("difficult")) return "Hard";
  return "Medium";
}

const questionShape = z.object({
  question: z.string(),
  category: z.string(),
  difficulty: z.string(),
  reason: z.string(),
  suggested_answer: z.string(),
  follow_up_questions: z.array(z.string()).optional().default([]),
});

const outputShape = z
  .object({
    interview: z
      .object({
        title: z.string().optional(),
        questions: z.array(questionShape).min(1),
      })
      .optional(),
    questions: z.array(questionShape).min(1).optional(),
  })
  .refine((data) => data.interview?.questions || data.questions, {
    message: "Response does not contain a questions array",
  });

/** Strip markdown fences / prose and pull out the first JSON object. */
export function extractJsonObject(text: string): unknown {
  const cleaned = text
    .replace(/```(?:json)?/gi, "")
    // Character-class negation already spans newlines, so no /s flag is needed.
    .replace(/^[^{[]*/, "")
    .replace(/[^}\]]*$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fall back to first balanced {...}
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("No JSON object found in model output.");
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

export function parseQuestions(raw: string): GeneratedQuestion[] {
  const parsed = extractJsonObject(raw);
  const result = outputShape.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Model output failed validation: ${result.error.issues[0]?.message ?? "invalid shape"}`);
  }
  const list = result.data.interview?.questions ?? result.data.questions ?? [];
  const questions: GeneratedQuestion[] = list.map((q) => ({
    question: q.question.trim(),
    category: normalizeCategory(q.category),
    difficulty: normalizeDifficulty(q.difficulty),
    reason: q.reason.trim(),
    suggested_answer: q.suggested_answer.trim(),
    follow_up_questions: q.follow_up_questions
      .map((f) => f.trim())
      .filter((f) => f.length > 0)
      .slice(0, 5),
  }));
  const cleaned = questions.filter(
    (q) => q.question.length >= 10 && q.reason.length >= 5 && q.suggested_answer.length >= 20
  );
  if (cleaned.length === 0) throw new Error("Model returned no usable questions.");
  return cleaned.slice(0, 24);
}

export function parseFollowUps(raw: string): string[] {
  const parsed = extractJsonObject(raw) as { follow_up_questions?: unknown };
  const list = Array.isArray(parsed?.follow_up_questions) ? parsed.follow_up_questions : [];
  const followUps = list
    .filter((f): f is string => typeof f === "string")
    .map((f) => f.trim())
    .filter((f) => f.length >= 5)
    .slice(0, 5);
  if (followUps.length === 0) throw new Error("Model returned no follow-up questions.");
  return followUps;
}

export function parseEvaluation(raw: string): { score: number; strengths: string[]; missing: string[]; improvements: string[] } {
  const parsed = extractJsonObject(raw) as {
    score?: unknown;
    strengths?: unknown;
    missing?: unknown;
    improvements?: unknown;
  };
  const asStringArray = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string").map((s) => s.trim()).filter(Boolean)
      : [];
  const score = typeof parsed.score === "number" ? Math.round(parsed.score) : Number(parsed.score);
  if (!Number.isFinite(score)) throw new Error("Model output missing a numeric score.");
  return {
    score: Math.min(100, Math.max(0, score)),
    strengths: asStringArray(parsed.strengths),
    missing: asStringArray(parsed.missing),
    improvements: asStringArray(parsed.improvements),
  };
}
