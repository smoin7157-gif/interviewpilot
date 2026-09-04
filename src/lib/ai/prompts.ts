import type { GenerationContext } from "./types";

export const GENERATION_SYSTEM_PROMPT = `You are an experienced interviewer who designs realistic, personal interview practice sets for job candidates on InterviewOS.

Context you may receive:
- Target role, experience level, company + company type, interview type
- A job description (use its actual responsibilities, tools, and requirements)
- Candidate context: resume facts, public GitHub profile, and manual projects

Rules:
- Personalize aggressively but honestly. When the candidate context mentions specific projects, technologies, or claims (e.g. "built HireAI with FastAPI"), ask about THOSE — never generic versions of them. Probe the candidate's actual decisions and trade-offs.
- Never invent candidate experience, projects, technologies, GitHub activity, or achievements. If a context source is missing, simply don't reference it.
- Use the job description to ground role-specific questions.
- Difficulty must map to experience level (Fresher/0–1 = mostly easy; 1–3 = easy/medium; 3–5 = medium; 5+ = medium/hard).
- Shape the question mix to the interview type when provided, approximately:
  - General/Mixed: 20% technical, 20% project/resume, 15% job_description, 15% behavioral, 10% coding, 10% company, 10% general
  - Technical: 30% technical, 20% coding, 15% project, 10% job_description, 10% system_design, 10% behavioral, 5% company/general
  - Behavioral / HR Recruiter: 45% behavioral, 15% general, 15% project, 15% company, 10% job_description
  - Coding: 40% coding, 25% technical, 15% system_design, 10% project, 10% general
  - System Design: 40% system_design, 20% technical, 10% coding, 10% project, 10% company, 10% general
  - Data / ML: 40% data_ml, 20% technical, 15% project, 10% coding, 10% behavioral, 5% general
  - Product: 30% job_description, 25% behavioral, 15% company, 15% project, 10% technical, 5% general
  When no interview type is given, use the General/Mixed mix.
- Categories (use exactly these keys): technical, behavioral, project, job_description, coding, system_design, data_ml, company, general.
- Difficulty (use exactly these keys): easy, medium, hard.
- Every question must carry a short "reason" (why it matters for this role/level) and a source_context array drawn from: experience, company, interview_type, job_description, resume, github, project, general.
- Avoid repetitive or filler questions. Questions must be answerable aloud (no code execution).
- suggested_answer: concise, natural, specific, easy to speak — not over-scripted. Behavioral answers mirror a STAR-like structure without lecturing.
- Provide 3 follow-up questions per main question that probe deeper into that answer.
- Return ONLY valid JSON matching the schema below. No markdown, no commentary.`;

export function buildGenerationUserPrompt(ctx: GenerationContext): string {
  const lines: string[] = [];

  lines.push(`Target role: ${ctx.role}`);
  lines.push(`Experience level: ${ctx.seniority}`);
  if (ctx.companyType) lines.push(`Company type: ${ctx.companyType}`);
  if (ctx.company) lines.push(`Company: ${ctx.company}`);
  if (ctx.interviewType) lines.push(`Interview type: ${ctx.interviewType}`);
  if (ctx.jobDescription) lines.push(`\nJob description:\n${ctx.jobDescription}`);
  if (ctx.candidateContext) {
    lines.push(`\nCandidate context (facts only — reference it when relevant, never invent more):\n${ctx.candidateContext}`);
  }
  lines.push(
    `\nGenerate exactly ${ctx.count} questions as a JSON object in this shape:\n` +
      JSON.stringify(
        {
          interview: {
            title: `${ctx.role} interview`,
            questions: [
              {
                question: "The interview question",
                category: "technical | behavioral | project | job_description | coding | system_design | data_ml | company | general",
                difficulty: "easy | medium | hard",
                reason: "Why this question matters for this role/level",
                source_context: ["resume", "job_description", "project", "company", "experience", "interview_type", "github", "general"],
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
  companyType?: string;
  interviewType?: string;
  jobDescription?: string;
}): string {
  const lines = [`Main question: ${ctx.question}`, `Target role: ${ctx.role}`, `Experience level: ${ctx.seniority}`];
  if (ctx.companyType) lines.push(`Company type: ${ctx.companyType}`);
  if (ctx.company) lines.push(`Company: ${ctx.company}`);
  if (ctx.interviewType) lines.push(`Interview type: ${ctx.interviewType}`);
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

export const RESUME_EXTRACTION_SYSTEM_PROMPT = `You extract structured facts from a candidate's resume for interview practice.

Rules:
- Extract ONLY information actually present in the resume text. Never infer, guess, or invent skills, jobs, projects, or achievements.
- Ignore contact details (name, email, phone, address, links) — do not include them in any field.
- Return ONLY valid JSON with these keys, each an array of short strings:
  skills, experience, education, projects, achievements, certifications, technologies
- experience/projects/achievements: keep each item to one concise phrase or sentence (max ~25 words).
- skills/technologies: individual tokens or short phrases, deduplicated, max 40 items each.
- If a section is absent from the resume, return an empty array for it.
No markdown, no commentary outside the JSON.`;

export function buildResumeExtractionUserPrompt(text: string): string {
  return (
    `Resume text:\n"""\n${text}\n"""\n\n` +
    `Return ONLY the JSON object described in your instructions, e.g.:\n` +
    JSON.stringify(
      {
        skills: ["TypeScript", "React"],
        experience: ["Software Engineer at Acme — built checkout flows (2021–2024)"],
        education: ["B.S. Computer Science, Example University"],
        projects: ["HireAI — AI interview practice app"],
        achievements: [],
        certifications: [],
        technologies: ["FastAPI", "PostgreSQL"],
      },
      null,
      2
    )
  );
}
