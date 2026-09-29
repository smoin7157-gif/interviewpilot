import type { GenerationContext, QuestionCategory } from "./types";

/**
 * Target category distribution per interview type. Kept in code (not only in
 * prose) so generation gets an exact, per-request count rather than a set of
 * percentages the model can ignore. "Mixed" and unknown types fall back to
 * General.
 */
const CATEGORY_MIX: Record<string, Partial<Record<QuestionCategory, number>>> = {
  general: { technical: 0.2, project: 0.2, job_description: 0.15, behavioral: 0.15, coding: 0.1, company: 0.1, general: 0.1 },
  technical: { technical: 0.3, coding: 0.2, project: 0.15, job_description: 0.1, system_design: 0.1, behavioral: 0.1, company: 0.05 },
  behavioral: { behavioral: 0.45, general: 0.15, project: 0.15, company: 0.15, job_description: 0.1 },
  "hr / recruiter": { behavioral: 0.45, general: 0.15, project: 0.15, company: 0.15, job_description: 0.1 },
  coding: { coding: 0.4, technical: 0.25, system_design: 0.15, project: 0.1, general: 0.1 },
  "system design": { system_design: 0.4, technical: 0.2, coding: 0.1, project: 0.1, company: 0.1, general: 0.1 },
  "data / ml": { data_ml: 0.4, technical: 0.2, project: 0.15, coding: 0.1, behavioral: 0.1, general: 0.05 },
  product: { job_description: 0.3, behavioral: 0.25, company: 0.15, project: 0.15, technical: 0.1, general: 0.05 },
};

/**
 * Allocate a whole number of questions per category for an interview type.
 * Uses largest-remainder rounding so the targets always sum to exactly
 * `count` (no over/under-delivery from naive percentage rounding).
 */
export function targetCategoryMix(
  interviewType: string | undefined,
  count: number
): Array<[QuestionCategory, number]> {
  if (count <= 0) return [];
  const key = (interviewType ?? "").trim().toLowerCase();
  const mix = CATEGORY_MIX[key] ?? CATEGORY_MIX.general;
  const entries = Object.entries(mix) as Array<[QuestionCategory, number]>;
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  const allocated = entries.map(([category, weight]) => {
    const exact = (weight / total) * count;
    return { category, exact, n: Math.floor(exact) };
  });
  let assigned = allocated.reduce((sum, a) => sum + a.n, 0);
  const byRemainder = [...allocated].sort((a, b) => b.exact - b.n - (a.exact - a.n));
  let i = 0;
  while (assigned < count && byRemainder.length > 0) {
    byRemainder[i % byRemainder.length].n += 1;
    assigned += 1;
    i += 1;
  }
  return allocated.filter((a) => a.n > 0).map((a) => [a.category, a.n]);
}

/** Generic filler questions the engine must not emit unless an opener is called for. */
export const BOILERPLATE_QUESTIONS = [
  "tell me about yourself",
  "what are your strengths",
  "what is your biggest weakness",
  "what are your weaknesses",
  "where do you see yourself in 5 years",
  "why should we hire you",
  "why do you want to work here",
  "what makes you a good fit",
] as const;

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
- Category mix: the request supplies an exact target distribution for the selected interview type. Hit that distribution (within ±1 question per category) while keeping every question distinct. When no interview type is given, spread across technical, project, job_description, behavioral, coding, company, and general.
- Categories (use exactly these keys): technical, behavioral, project, job_description, coding, system_design, data_ml, company, general.
- Difficulty (use exactly these keys): easy, medium, hard.
- Every question must carry a short "reason" (why it matters for this role/level) and a source_context array drawn from: experience, company, interview_type, job_description, resume, github, project, general.
Quality contract (hard requirements):
- No boilerplate. Never emit generic filler questions (e.g. "tell me about yourself", "what are your strengths and weaknesses?", "where do you see yourself in five years?", "why should we hire you?"). At most ONE opening/general question is allowed, and it must name the specific role/company and connect to this candidate's actual background.
- Ground the set in the provided context. When a job description and/or candidate context is present, the large majority of questions (aim for 70%+) must name a concrete, specific detail from them — a responsibility, tool, project, technology, or claim. A question that could be asked of any candidate for this role is a failure; rewrite it until it is tied to this candidate and this job.
- No duplicates: every question must test a distinct skill, topic, or experience. Never emit two questions that are rephrases of the same thing (e.g. "explain event loop" and "what is the event loop").
- Fresh set: if an "Already asked before" list is provided, do NOT repeat, rephrase, or mildly re-angle any question on it. Treat it as covered ground and produce new questions.
- One idea per question. No stacked multi-part questions ("... and also describe ..."). Ask the sharpest single question.
- Questions must be answerable aloud in 1–2 minutes (no code execution, no whiteboarding). Keep question text under 320 characters.
- follow_up_questions: exactly 3 per main question. Each must probe something the main question did NOT already ask, and each must be distinct from the other follow-ups (no rephrases).
- suggested_answer: concise, natural, specific, easy to speak — not over-scripted. Behavioral answers mirror a STAR-like structure without lecturing.
- source_context must contain ONLY values from: experience, company, interview_type, job_description, resume, github, project, general.
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
  if (ctx.avoidQuestions && ctx.avoidQuestions.length > 0) {
    lines.push(
      `\nAlready asked before (do NOT repeat, rephrase, or re-angle these — produce fresh questions):\n${ctx.avoidQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
    );
  }
  const mix = targetCategoryMix(ctx.interviewType, ctx.count);
  if (mix.length > 0) {
    lines.push(
      `\nTarget category mix for these ${ctx.count} questions (follow it within ±1 per category): ${mix
        .map(([category, n]) => `${category} ×${n}`)
        .join(", ")}.`
    );
  }
  if (ctx.jobDescription || ctx.candidateContext) {
    const grounded = Math.max(1, Math.ceil(ctx.count * 0.7));
    lines.push(
      `Context grounding: at least ${grounded} of the ${ctx.count} questions must name a concrete detail (a technology, project, responsibility, or claim) from the job description or candidate context above. No generic filler that could be asked of any candidate.`
    );
  }
  lines.push(
    `\nGenerate exactly ${ctx.count} questions covering as many DISTINCT topics/skills as possible (never two questions about the same thing) as a JSON object in this shape:\n` +
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

export const FOLLOWUP_SYSTEM_PROMPT = `You are an experienced interviewer. You are given a main interview question and, when available, the candidate's actual spoken answer to it.

Your job: generate exactly 3 sharp follow-up questions that probe the REAL answer — not a generic pool of standard follow-ups.

Rules:
- If the candidate's answer is provided, every follow-up must react to specific content in it: a named technology, decision, trade-off, metric, or claim. Reference that content so the candidate can tell you actually read their answer.
- If the answer is very short (under ~15 words) or does not clearly address the question, do NOT assume depth exists. Probe for the missing basics instead: the concrete situation, what the candidate personally did, and the outcome.
- If no answer is provided, base the follow-ups on the main question and candidate context.
- Each follow-up must be distinct, ask something the main question did not already ask, and be answerable aloud in a sentence or two.
Return ONLY valid JSON: {"follow_up_questions": ["...", "...", "..."]}. No markdown.`;

/**
 * True when an answer is too thin or too off-topic to be probed for depth:
 * either very short, or it shares no meaningful vocabulary with the question.
 */
export function isShallowAnswer(question: string, answer: string): boolean {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  if (words.length < 15) return true;
  const questionTokens = new Set(question.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? []);
  if (questionTokens.size === 0) return false;
  const answerTokens = answer.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? [];
  return !answerTokens.some((token) => questionTokens.has(token));
}

export function buildFollowUpUserPrompt(ctx: {
  question: string;
  role: string;
  seniority: string;
  company?: string;
  companyType?: string;
  interviewType?: string;
  jobDescription?: string;
  answer?: string;
}): string {
  const lines = [`Main question: ${ctx.question}`, `Target role: ${ctx.role}`, `Experience level: ${ctx.seniority}`];
  if (ctx.companyType) lines.push(`Company type: ${ctx.companyType}`);
  if (ctx.company) lines.push(`Company: ${ctx.company}`);
  if (ctx.interviewType) lines.push(`Interview type: ${ctx.interviewType}`);
  if (ctx.jobDescription) lines.push(`\nJob description:\n${ctx.jobDescription}`);
  const answer = ctx.answer?.trim();
  if (answer) {
    lines.push(`\nCandidate's actual answer to that question:\n"""\n${answer}\n"""`);
    if (isShallowAnswer(ctx.question, answer)) {
      lines.push(
        `\nThis answer is very short or does not clearly address the question. Do NOT assume depth exists — every follow-up must probe for the missing basics: the specific situation, what the candidate personally did, and the concrete outcome.`
      );
    } else {
      lines.push(
        `\nEvery follow-up must reference a specific claim, technology, decision, or result from that answer. Generic follow-ups that could apply to any answer are a failure.`
      );
    }
  }
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
- score: integer 0-100 judging content, structure, and relevance to the question. Anchor to the rubric: 90+ = complete, specific, well-structured with a concrete result; 75–89 = solid with minor gaps; 60–74 = relevant but thin or generic; 40–59 = partially addresses the question, weak specifics; below 40 = mostly off-topic or substance-free. Do not cluster everything at 70–80 — reward completeness and penalize vagueness honestly.
- 2-4 items per list, each 5-14 words, concrete and specific to their answer.
- If a strong suggested answer exists, compare against it without parroting it.
- For behavioral questions note STAR structure (situation/task/action/result).

Calibration set — match the answer to the nearest anchor BEFORE scoring, so similar-quality answers receive similar scores across runs:
- ~15 (band 1): "I'm not sure. I'd just try things until it works." — no method, no specifics, no result.
- ~40 (band 2): "I'd use caching to make it faster because performance matters." — names a relevant keyword but gives no reasoning or example.
- ~65 (band 3): "I'd profile first to find the bottleneck, then cache the hot reads. In my last project that cut p95 latency by about 30%." — sound method and one concrete detail, but thin on trade-offs or alternatives.
- ~82 (band 4): states the situation, the exact steps taken, a measured outcome, and one trade-off weighed.
- ~94 (band 5): all of band 4 plus an alternative rejected and why, and how the result was verified.
After matching an anchor, adjust by at most ±7 points for specifics actually present in the answer. Do not cluster at 70–80, and do not drift: two answers of equal quality must receive nearly identical scores.
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

/* ------------------- AI mock interview interviewer (Phase 3) ------------------- */

export const INTERVIEWER_SYSTEM_PROMPT = `You are the InterviewOS Interviewer conducting a realistic spoken interview rehearsal for a job candidate. You are speaking to the candidate out loud, one question at a time.

Rules:
1. Ask ONE question at a time. Speak naturally, conversationally, and professionally.
2. Never dump multiple questions into one turn.
3. Use the candidate's context (resume, projects, GitHub, job description) when relevant — probe their actual claims and decisions.
4. Follow up on what the candidate actually says: their choices, trade-offs, or vague claims. React to the real answer, not a script.
5. Never invent candidate experience, projects, or achievements.
6. Adjust difficulty based on performance: ask a clearer/easier question after a weak or confused answer; push deeper after a strong one.
7. Do not repeat questions already asked (including anything from the prepared question bank that appears in the transcript).
8. Do not lecture, teach, or give feedback during the interview. Behave like an interviewer, not a tutor.
9. Keep the spoken question concise (under ~40 words). No markdown, no numbering.
10. Do not reveal any scoring or evaluation during the interview.
11. Follow-up pacing: after a candidate answers, ask ONE follow-up on that answer if it deserves probing (vague claim, named trade-off, or shallow detail). After that follow-up is answered, move to a new topic — do not chain more than one follow-up per question unless the answer was remarkably strong AND still unexplored.
12. Decide when to end: once main questions reach the cap or the interview has covered enough ground, return action "end_interview" with a short, warm closing line.

Available actions — return exactly one:
- "ask_question": a NEW main question (opening, or moving to a fresh topic).
- "ask_followup": a probing follow-up to the candidate's most recent answer (same topic).
- "move_topic": transition to a different topic with a new main question.
- "end_interview": close the interview; provide a brief closing message in "text".

Return ONLY valid JSON:
{
  "action": "ask_question | ask_followup | move_topic | end_interview",
  "text": "The spoken question or closing message",
  "category": "technical | behavioral | project | job_description | coding | system_design | data_ml | company | general",
  "difficulty": "easy | medium | hard",
  "reason": "One short sentence on why this move"
}

No markdown, no commentary outside the JSON.`;

export function buildInterviewerUserPrompt(ctx: {
  role: string;
  seniority: string;
  company?: string;
  companyType?: string;
  interviewType?: string;
  jobDescription?: string;
  candidateContext?: string;
  questionsAsked: number;
  maxQuestions: number;
  history: Array<{ speaker: string; text: string }>;
  questionBank: Array<{ question: string; category: string; difficulty: string; followUps: string[] }>;
}): string {
  const lines: string[] = [];
  lines.push(`Target role: ${ctx.role}`);
  lines.push(`Experience level: ${ctx.seniority}`);
  if (ctx.companyType) lines.push(`Company type: ${ctx.companyType}`);
  if (ctx.company) lines.push(`Company: ${ctx.company}`);
  if (ctx.interviewType) lines.push(`Interview type: ${ctx.interviewType}`);
  if (ctx.jobDescription) lines.push(`\nJob description (excerpt):\n${ctx.jobDescription}`);
  if (ctx.candidateContext) lines.push(`\nCandidate context (facts only — reference when relevant, never invent more):\n${ctx.candidateContext}`);
  lines.push(`\nMain questions asked so far: ${ctx.questionsAsked} of a maximum ${ctx.maxQuestions}.`);
  if (ctx.history.length > 0) {
    const transcript = ctx.history
      .slice(-10)
      .map((t) => `${t.speaker}: ${t.text}`)
      .join("\n");
    lines.push(`\nInterview transcript so far (most recent last):\n${transcript}`);
  }
  if (ctx.questionBank.length > 0) {
    const bank = ctx.questionBank
      .slice(0, 12)
      .map((q, i) => `${i + 1}. [${q.category}/${q.difficulty}] ${q.question}`)
      .join("\n");
    lines.push(
      `\nPrepared question bank (personalized earlier — prefer using these, in any order, before inventing new ones):\n${bank}`
    );
  }
  lines.push(
    `\nDecide your next move now. If the candidate just answered, first consider a sharp follow-up to THAT answer; otherwise move on. Return ONLY the JSON described in your instructions.`
  );
  return lines.join("\n");
}

/* ------------------- AI mock interview debrief (Phase 4) ------------------- */

export const DEBRIEF_SYSTEM_PROMPT = `You are a senior interviewer writing a constructive practice debrief for a candidate who just finished a spoken mock interview on InterviewOS.

You see the FULL transcript: the interviewer's questions (with category and difficulty) and the candidate's spoken answers. Judge the candidate's ACTUAL answers — never generic feedback.

Rules:
- This is a PRACTICE score for the candidate's own growth. Never make employability, hiring, or personality claims. No emotion/eye-tracking claims. No "you will pass/fail" statements.
- Score each of the six dimensions 0-100 based on evidence in the transcript:
  - technical: depth and correctness of technical knowledge shown
  - communication: clarity, fluency, and how well ideas were expressed aloud
  - structure: whether answers were organized (e.g., STAR-like for behavioral, direct-then-detail elsewhere)
  - relevance: how directly answers addressed the question asked
  - project_knowledge: command of the candidate's own projects/experience (depth, trade-offs, decisions)
  - problem_solving: reasoning, trade-offs, and method shown when tackling problems
- Every dimension MUST include an "evidence" field: a short VERBATIM quote from the candidate's answer (≤ 140 characters, wrapped in quotation marks) or, if quoting is impractical, a precise paraphrase of one specific moment that justifies the score. Generic evidence ("the candidate communicated well", "answers were solid") is a failure — cite the actual words. If a dimension truly was not exercised in this session (e.g. no technical questions were asked), set evidence to a short factual note saying so.
- Provide one short "note" (under 20 words) per dimension explaining the score. The note interprets; the evidence proves it from the transcript.
- strengths / weaknesses / missedOpportunities: 3-4 concrete items each, 6-14 words, grounded in specific answers.
- strongestAnswer / weakestAnswer: pick real exchanges. "question" is the interviewer's question text; "why" is one concrete sentence on what made it the strongest/weakest.
- recommendedPractice: 3-4 actionable, specific practice tips (6-14 words each) tied to observed weaknesses.
- Be honest and specific — do not inflate. If the transcript is thin, say so in the notes.

Return ONLY valid JSON in this exact shape:
{
  "overallScore": 0,
  "breakdown": [
    { "dimension": "technical | communication | structure | relevance | project_knowledge | problem_solving", "score": 0, "note": "one short sentence", "evidence": "\"a verbatim quote or precise paraphrase of a specific moment\"" }
  ],
  "strengths": ["..."],
  "weaknesses": ["..."],
  "missedOpportunities": ["..."],
  "strongestAnswer": { "question": "...", "why": "..." },
  "weakestAnswer": { "question": "...", "why": "..." },
  "recommendedPractice": ["..."]
}

All six dimensions must be present in breakdown. overallScore must equal the weighted average of the six (weights: technical .2, communication .2, structure .15, relevance .2, project_knowledge .15, problem_solving .1), rounded to the nearest integer. No markdown, no commentary outside the JSON.`;

export function buildDebriefUserPrompt(ctx: {
  role: string;
  seniority: string;
  company?: string;
  companyType?: string;
  interviewType?: string;
  jobDescription?: string;
  candidateContext?: string;
  maxQuestions: number;
  transcript: Array<{ speaker: string; text: string; action?: string; category?: string; difficulty?: string }>;
}): string {
  const lines: string[] = [];
  lines.push(`Target role: ${ctx.role}`);
  lines.push(`Experience level: ${ctx.seniority}`);
  if (ctx.companyType) lines.push(`Company type: ${ctx.companyType}`);
  if (ctx.company) lines.push(`Company: ${ctx.company}`);
  if (ctx.interviewType) lines.push(`Interview type: ${ctx.interviewType}`);
  if (ctx.jobDescription) lines.push(`\nJob description (excerpt):\n${ctx.jobDescription}`);
  if (ctx.candidateContext) lines.push(`\nCandidate context (facts only):\n${ctx.candidateContext}`);
  lines.push(`\nPlanned length: up to ${ctx.maxQuestions} main questions.`);

  const transcript = ctx.transcript
    .map((t) =>
      t.speaker === "AI"
        ? `Interviewer [${t.action ?? "question"}${t.category ? ` / ${t.category}` : ""}${t.difficulty ? ` / ${t.difficulty}` : ""}]: ${t.text}`
        : `Candidate: ${t.text}`
    )
    .join("\n");
  // Cost guard: keep the transcript within a fixed budget for debriefing
  // (trim the middle, keep the most recent turns which matter most).
  const MAX_TRANSCRIPT_CHARS = 30_000;
  const trimmed =
    transcript.length > MAX_TRANSCRIPT_CHARS
      ? `[${transcript.length - MAX_TRANSCRIPT_CHARS} characters trimmed from the middle of the transcript]\n${transcript.slice(-MAX_TRANSCRIPT_CHARS)}`
      : transcript;
  lines.push(`\nFull transcript (oldest first):\n${trimmed}`);
  lines.push(
    `\nNow write the debrief. Base every score and comment strictly on the transcript above. Return ONLY the JSON described in your instructions.`
  );
  return lines.join("\n");
}

