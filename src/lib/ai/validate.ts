import { z } from "zod";
import { QUESTION_CATEGORIES } from "@/lib/validation";
import type { GeneratedQuestion, QuestionCategory, QuestionDifficulty } from "./types";

const categoryValues = QUESTION_CATEGORIES as readonly string[];

export function normalizeCategory(raw: string): QuestionCategory {
  const value = raw.trim().toLowerCase();
  // Legacy capitalized values map onto the InterviewOS vocabulary.
  const exact: Record<string, QuestionCategory> = {
    technical: "technical",
    behavioral: "behavioral",
    project: "project",
    general: "general",
    "role-specific": "job_description",
    "role specific": "job_description",
  };
  if (value in exact) return exact[value];
  if (value.includes("system_design") || value.includes("system design") || value.includes("architecture")) return "system_design";
  if (value.includes("job_description") || value.includes("job description") || value.includes("jd") || value.includes("based on the role")) return "job_description";
  if (value.includes("data_ml") || value.includes("data / ml") || value.includes("machine learning") || value.includes("ml") || value.includes("data science") || value.includes("statistics")) return "data_ml";
  if (value.includes("coding") || value.includes("algorithm") || value.includes("data structure")) return "coding";
  if (value.includes("company") || value.includes("role context")) return "company";
  if (value.includes("project")) return "project";
  if (value.includes("behavior") || value.includes("behaviour") || value.includes("cultural")) return "behavioral";
  if (value.includes("technical") || value.includes("fundamentals")) return "technical";
  if (value.includes("general") || value.includes("opening") || value.includes("introduction")) return "general";
  // Last-resort containment against the canonical list.
  const match = categoryValues.find((c) => value.includes(c));
  if (match) return match as QuestionCategory;
  return "general";
}

export function normalizeDifficulty(raw: string): QuestionDifficulty {
  const value = raw.trim().toLowerCase();
  if (value.includes("easy") || value.includes("junior") || value.includes("entry") || value.includes("fresher")) return "easy";
  if (value.includes("hard") || value.includes("senior") || value.includes("difficult")) return "hard";
  return "medium";
}

const questionShape = z.object({
  question: z.string(),
  category: z.string(),
  difficulty: z.string(),
  reason: z.string(),
  source_context: z.array(z.string()).optional().default([]),
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
    .replace(/[^}\\]]*$/, "");
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
    source_context: q.source_context
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0)
      .slice(0, 8),
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

const resumeShape = z.object({
  skills: z.array(z.string()).default([]),
  experience: z.array(z.string()).default([]),
  education: z.array(z.string()).default([]),
  projects: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
});

const interviewerDecisionShape = z.object({
  action: z.enum(["ask_question", "ask_followup", "move_topic", "end_interview"]),
  text: z.string(),
  category: z.string().optional().nullable(),
  difficulty: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
});

export function parseInterviewerDecision(raw: string): {
  action: "ask_question" | "ask_followup" | "move_topic" | "end_interview";
  text: string;
  category?: QuestionCategory;
  difficulty?: QuestionDifficulty;
  reason?: string;
} {
  const parsed = extractJsonObject(raw);
  const result = interviewerDecisionShape.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Interviewer output failed validation: ${result.error.issues[0]?.message ?? "invalid shape"}`);
  }
  const data = result.data;
  const text = data.text.trim().replace(/\s+/g, " ");
  if (data.action !== "end_interview") {
    if (text.length < 3) throw new Error("Interviewer returned an empty question.");
  }
  if (text.length > 800) throw new Error("Interviewer text is unreasonably long.");
  return {
    action: data.action,
    text,
    category: data.category ? normalizeCategory(data.category) : undefined,
    difficulty: data.difficulty ? normalizeDifficulty(data.difficulty) : undefined,
    reason: data.reason?.trim().slice(0, 400) || undefined,
  };
}

export function parseResume(raw: string): {
  skills: string[];
  experience: string[];
  education: string[];
  projects: string[];
  achievements: string[];
  certifications: string[];
  technologies: string[];
} {
  const parsed = extractJsonObject(raw);
  const result = resumeShape.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Resume extraction failed validation: ${result.error.issues[0]?.message ?? "invalid shape"}`);
  }
  const clean = (list: string[], max: number) =>
    list.map((s) => s.trim()).filter((s) => s.length > 0).slice(0, max);
  return {
    skills: clean(result.data.skills, 40),
    experience: clean(result.data.experience, 15),
    education: clean(result.data.education, 8),
    projects: clean(result.data.projects, 10),
    achievements: clean(result.data.achievements, 10),
    certifications: clean(result.data.certifications, 10),
    technologies: clean(result.data.technologies, 40),
  };
}
