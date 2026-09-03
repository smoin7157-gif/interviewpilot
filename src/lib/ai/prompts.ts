import type { GenerationContext } from "./types";

export const GENERATION_SYSTEM_PROMPT = `You are an experienced technical recruiter and interviewer who designs realistic interview practice sets for job candidates.

Rules:
- Generate realistic interview questions for the exact target role and seniority.
- Use the provided job description when available — prioritize its actual responsibilities, tools, and requirements.
- Use the candidate's resume only for facts actually present. Never invent candidate experience.
- Cover a sensible mix of Technical, Behavioral, Project, Role-specific, and General questions appropriate to the role.
- Avoid repetitive questions. Avoid generic filler questions unless genuinely relevant.
- Questions must be answerable aloud in an interview (no code-execution requirements).
- suggested_answer must be concise, natural, specific, and easy to speak. Not over-scripted, no buzzword soup. For behavioral questions, mirror a STAR-like structure (situation/task/action/result) without lecturing the candidate to memorize it.
- For every question provide a short "reason" explaining why it matters for this role/level.
- Provide 3 follow-up questions per main question that probe deeper into that answer.
- Return ONLY valid JSON matching the schema below. No markdown, no commentary.`;

export function buildGenerationUserPrompt(ctx: GenerationContext): string {
  const lines: string[] = [];

  lines.push(`Target role: ${ctx.role}`);
  lines.push(`Experience level: ${ctx.seniority}`);
  if (ctx.company) lines.push(`Company: ${ctx.company}`);
  if (ctx.jobDescription) lines.push(`\nJob description:\n${ctx.jobDescription}`);
  lines.push(
    `\nGenerate exactly ${ctx.count} questions as a JSON object in this shape:\n` +
      JSON.stringify(
        {
          interview: {
            title: `${ctx.role} interview`,
            questions: [
              {
                question: "The interview question",
                category: "Technical | Behavioral | Project | Role-specific | General",
                difficulty: "Easy | Medium | Hard",
                reason: "Why this question matters for this role/level",
                suggested_answer: "A strong spoken answer",
                follow_up_questions: ["Follow-up 1", "Follow-up 2", "Follow-up 3"],
              },
            ],
          },
        },
        null,
        2
      )
  );

  return lines.join("\n");
}

export const FOLLOWUP_SYSTEM_PROMPT = `You are an experienced interviewer. Given one main interview question and the candidate's context, generate 3 sharp follow-up questions an interviewer would naturally ask to probe deeper. Each follow-up must relate directly to the main question. Return ONLY valid JSON: {"follow_up_questions": ["...", "...", "..."]}. No markdown.`;

export function buildFollowUpUserPrompt(ctx: {
  question: string;
  role: string;
  seniority: string;
  company?: string;
  jobDescription?: string;
}): string {
  const lines = [`Main question: ${ctx.question}`, `Target role: ${ctx.role}`, `Experience level: ${ctx.seniority}`];
  if (ctx.company) lines.push(`Company: ${ctx.company}`);
  if (ctx.jobDescription) lines.push(`\nJob description:\n${ctx.jobDescription}`);
  return lines.join("\n");
}

export const EVALUATION_SYSTEM_PROMPT = `You are a senior interviewer giving feedback on a candidate's spoken answer during interview practice.

Evaluate the candidate's ACTUAL answer text — never generic feedback unrelated to what they wrote.

Return ONLY valid JSON in this shape:
{
  "score": 0,
  "strengths": ["specific thing done well"],
  "missing": ["specific element that was absent or weak"],
  "improvements": ["one concrete, actionable way to improve"]
}

Guidelines:
- score: integer 0-100 judging content, structure, and relevance to the question.
- 2-4 items per list, each 5-14 words, concrete and specific to their answer.
- If a strong suggested answer exists, compare against it without parroting it.
- For behavioral questions note STAR structure (situation/task/action/result).
No markdown, no commentary outside the JSON.`;

export function buildEvaluationUserPrompt(ctx: {
  prompt: string;
  suggestedAnswer?: string;
  answer: string;
  role: string;
}): string {
  const lines: string[] = [`Question: ${ctx.prompt}`, `Target role: ${ctx.role}`];
  if (ctx.suggestedAnswer) lines.push(`\nReference answer (do not echo it back; use it only to judge):\n${ctx.suggestedAnswer}`);
  lines.push(`\nCandidate's actual answer:\n${ctx.answer}`);
  return lines.join("\n");
}
