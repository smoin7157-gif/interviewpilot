import type {
  AIProvider,
  EvaluationContext,
  EvaluationResult,
  FollowUpContext,
  GeneratedQuestion,
  GenerationContext,
  InterviewerContext,
  InterviewerDecision,
  QuestionCategory,
} from "./types";
import { normalizeCategory, normalizeDifficulty } from "./validate";
import { EMPTY_RESUME, type ResumeData } from "@/lib/candidate-context";

/**
 * Deterministic, offline provider. Used when OpenRouter is not configured or
 * fails, so the product flow always works locally. Questions are realistic
 * templates tuned to the role/seniority; answers are concise and speakable.
 */

interface Template {
  category: QuestionCategory;
  difficulty: "easy" | "medium" | "hard";
  question: (ctx: GenerationContext) => string;
  reason: (ctx: GenerationContext) => string;
  answer: (ctx: GenerationContext) => string;
  followUps: (ctx: GenerationContext) => string[];
}

const role = (ctx: GenerationContext) => ctx.role;
const level = (ctx: GenerationContext) => ctx.seniority.toLowerCase();

const TEMPLATES: Template[] = [
  {
    category: "general",
    difficulty: "easy",
    question: (c) => `Walk me through your background and why you are interested in the ${role(c)} role${c.company ? ` at ${c.company}` : ""}.`,
    reason: (c) => `Opens the interview and shows how the candidate frames their own story against this ${level(c)} ${role(c)} opportunity.`,
    answer: (c) =>
      `"I have been building toward ${role(c)} work over the past few years. In my most recent roles I focused on delivering reliable, user-facing results and collaborating closely with cross-functional teams. I am drawn to this role because it matches both my experience and where I want to grow, and I have been following ${c.company ? `${c.company}'s work` : "the problems this team solves"} closely. In my last position I took ownership of a feature end-to-end, which taught me how to balance scope, quality, and deadlines."`,
    followUps: (c) => [
      `What specifically in your experience maps to this ${role(c)} role?`,
      "Where do you want to grow in the next two years?",
      "What kind of team culture brings out your best work?",
    ],
  },
  {
    category: "technical",
    difficulty: "easy",
    question: () => `Can you explain an API and why it matters in software development?`,
    reason: (c) =>
      `A foundational check that the candidate can explain core concepts clearly — essential even at ${level(c)} level for ${role(c)}.`,
    answer: () =>
      `"An API is a defined contract that lets one piece of software talk to another without knowing how the other works internally. It matters because it lets teams build and evolve systems independently, reuse services, and keep boundaries clean — a frontend can call a backend, or our app can call a payment provider, through a stable interface instead of shared code."`,
    followUps: () => ["What is the difference between REST and GraphQL?", "How would you secure an API?", "How do you decide what belongs in an API vs. in the client?"],
  },
  {
    category: "technical",
    difficulty: "medium",
    question: () => `How do you approach debugging a production issue you cannot reproduce locally?`,
    reason: (c) =>
      `Real debugging skill separates prepared ${level(c)} candidates: they need a method, not just intuition.`,
    answer: () =>
      `"First I gather evidence: recent deploys, logs, error trackers, and affected user reports to narrow the blast radius. I add targeted logging or a temporary trace if needed, and I look for what changed right before the issue started. Once I form a hypothesis I test it with the cheapest experiment that proves or disproves it, and I keep a written timeline so the fix is auditable. If I am stuck, I involve a teammate early with everything I have learned."`,
    followUps: () => ["What was the hardest bug you ever fixed?", "How do you prioritize which alerts to act on?", "When would you roll back a deploy instead of hotfixing?"],
  },
  {
    category: "technical",
    difficulty: "medium",
    question: () => `How do you design for performance, and when do you stop optimizing?`,
    reason: () => `Tests engineering judgment: knowing where bottlenecks actually come from and when effort is wasted.`,
    answer: () =>
      `"I start from data — profiles or traces rather than guesses — and I optimize the hot path that users actually feel. I set a measurable target first, make one change at a time, and measure again. I stop when the change no longer moves the metric that matters or when the complexity cost outweighs the gain, and I document the decision so the next person knows why we stopped."`,
    followUps: () => ["Describe a time an optimization backfired.", "How do you measure frontend vs. backend performance?", "How would you load-test a service before launch?"],
  },
  {
    category: "technical",
    difficulty: "hard",
    question: () => `How would you scale a service that currently handles 100 requests per second to 10,000?`,
    reason: () => `A classic senior-leaning question that exposes whether the candidate reasons about bottlenecks, caching, and data consistency.`,
    answer: () =>
      `"I would start by profiling to find the real constraint rather than guessing — often it is the database, not the app servers. Then I work through the levers in order: caching read-heavy data, adding horizontal replicas for the stateless app tier, batching or queueing expensive work, adding read replicas or partitioning the database, and making sure retries and rate limits prevent cascading failures. At each step I re-measure, because the next bottleneck usually appears right after the first one is removed."`,
    followUps: () => ["How do you keep cached data consistent?", "How would you handle a sudden traffic spike?", "What breaks when you add a queue, and how do you handle it?"],
  },
  {
    category: "behavioral",
    difficulty: "medium",
    question: () => `Tell me about a project where you had to learn new skills or technologies quickly.`,
    reason: (c) =>
      `Evaluates how the candidate learns unfamiliar technology under pressure — a core expectation for a ${role(c)} hire.`,
    answer: () =>
      `"Recently I needed to ship a feature in a stack I had not used before. I gave myself a short structured plan: build the smallest working slice first to learn the core concepts, then expand. I used official docs and small experiments rather than tutorials, and I asked one senior teammate targeted questions instead of guessing. I shipped on time, and the approach taught me to treat unfamiliar tech as a scoping problem, not a risk."`,
    followUps: () => ["Why did you choose that learning path?", "What did you not have time to learn properly?", "What would you do differently next time?"],
  },
  {
    category: "behavioral",
    difficulty: "medium",
    question: () => `Tell me about a time you disagreed with a teammate or manager about the right approach.`,
    reason: () => `Reveals communication style, humility, and whether the candidate can push back professionally.`,
    answer: () =>
      `"I disagreed with my lead on the right technical approach for a feature — I wanted a smaller migration, they wanted to pay down the architecture debt now. Instead of debating in the moment, I wrote up both options with cost, risk, and user impact, and we reviewed it together. They agreed to phase the change so we got the architecture win without blocking the release. The lesson I took away was to argue with data and stay open to being wrong."`,
    followUps: () => ["What if they had still said no?", "How do you decide when to escalate a disagreement?", "Has a teammate ever changed your mind?"],
  },
  {
    category: "behavioral",
    difficulty: "easy",
    question: () => `How do you prioritize your tasks when you have multiple responsibilities and a tight deadline?`,
    reason: () => `Checks for a repeatable prioritization system rather than reactive busywork.`,
    answer: () =>
      `"I keep a short written list and rank by two things: impact on the goal and urgency from others. I protect focus time for the top item each morning, batch small requests, and communicate trade-offs early — if something has to slip, I say so before it becomes a surprise. At the end of the week I review what took longer than expected so my next estimates are better."`,
    followUps: () => ["Give an example of a trade-off you had to make.", "What do you do when everything is truly urgent?", "How do you say no to low-value work?"],
  },
  {
    category: "behavioral",
    difficulty: "hard",
    question: () => `Tell me about a time something you built failed or had a serious impact. What happened, and what did you do?`,
    reason: () => `Tests ownership and honesty — how the candidate behaves after an incident, not just during it.`,
    answer: () =>
      `"I shipped a change that caused an outage for a subset of users. I took ownership immediately: we rolled back first to contain impact, then I led the post-mortem without pointing fingers. The root cause was a case I had not tested. I added that case to our automated suite and changed our review checklist so the class of bug could not happen again. It was uncomfortable, but it made me a more rigorous engineer and the team trusted me more afterward."`,
    followUps: () => ["What was the first thing you did after the outage?", "How did your team's process change afterward?", "What did you learn about your own blind spots?"],
  },
  {
    category: "project",
    difficulty: "medium",
    question: () => `Walk me through your most impressive project from start to finish.`,
    reason: () => `The flagship project question: shows depth, ownership, and how the candidate communicates technical work.`,
    answer: (c) =>
      `"The project I am proudest of solved ${c.jobDescription ? "a problem very close to the job description we are discussing" : "a real problem for my team's users"}. I owned it from design to launch: I scoped it with stakeholders, made the key architecture decisions, and shipped it in stages so we got feedback early. The hard part was ${c.jobDescription ? "aligning the design with the constraints in the role" : "deciding the right data model"}. The result measurably improved the metric we cared about, and I documented it well enough that another engineer could take it over."`,
    followUps: () => [
      `Why did you choose the main technology in that project?`,
      "What trade-offs did you make, and what would you change if you built it again?",
      "What was the biggest technical challenge you hit?",
    ],
  },
  {
    category: "project",
    difficulty: "medium",
    question: () => `How do you make sure the code you write is maintainable by others?`,
    reason: () => `Signals senior habits: code review, naming, tests, and documentation rather than cleverness.`,
    answer: () =>
      `"I write for the next reader: clear names, small functions, and comments only where the why is non-obvious. I rely on automated tests to lock in behavior and I keep pull requests small enough to review properly. I also document decisions that cost real time to rediscover — like why we chose one approach over another — because that is what future maintainers actually need."`,
    followUps: () => ["How do you handle legacy code you cannot rewrite?", "What does a good code review look like to you?", "How much test coverage is enough?"],
  },
  {
    category: "project",
    difficulty: "hard",
    question: () => `Describe a technical decision you made that you later regretted.`,
    reason: () => `Checks self-awareness: good engineers revisit decisions and can articulate what they would change.`,
    answer: () =>
      `"I chose a clever abstraction early in a project because it felt elegant, and it cost us more than it saved as requirements changed. The refactor to something more concrete was painful. What I learned is to prefer the simplest thing that works until the pattern genuinely repeats a third time, and to write down the trade-off at decision time — future-me usually needed the reasoning I had kept in my head."`,
    followUps: () => ["When is an abstraction actually worth it?", "How do you keep a growing codebase from becoming over-engineered?", "How do you reverse a decision once code is shipped?"],
  },
  {
    category: "company",
    difficulty: "medium",
    question: (c) => `What do you think are the biggest challenges facing someone in a ${role(c)} role${c.company ? ` at ${c.company}` : ""} today?`,
    reason: () => `Shows whether the candidate has researched the role and thinks about the job beyond their own tasks.`,
    answer: (c) =>
      `"Based on what I have seen, the main challenges are keeping quality high while speed is expected, communicating clearly across teams, and staying current as the tools and best practices evolve. For a ${role(c)} specifically, I would add ${c.company ? "the need to work well within existing systems and team conventions while still pushing for improvements" : "turning vague requirements into concrete, testable work"}. I prepare for this by staying close to the users of what I build and by reviewing how similar problems were solved before."`,
    followUps: () => [
      `What tools or workflows would you want to learn first in this role?`,
      "How would you approach your first 30 days here?",
      "What would make you successful in this role beyond the job description?",
    ],
  },
  {
    category: "company",
    difficulty: "easy",
    question: () => `What tools and technologies are you most comfortable with, and which are you still learning?`,
    reason: (c) => `A direct fit check against the tooling this ${role(c)} role depends on, with honesty about gaps.`,
    answer: () =>
      `"I am most comfortable with the core stack I use daily — version control, the languages and frameworks in my recent projects, and the tooling around testing and deployment. I would not claim expertise I do not have. Right now I am deliberately learning the areas this role leans on that I have used less, because I have found I pick up new tools fastest when I am learning them for a real problem rather than in the abstract."`,
    followUps: () => ["Which tool would you drop from your stack if you could?", "How do you evaluate a new technology before adopting it?", "What is the last tool you taught yourself, and how?"],
  },
  {
    category: "company",
    difficulty: "hard",
    question: () => `How would you improve a system or process you have never seen before, without breaking what works?`,
    reason: () => `Tests how a candidate enters an unfamiliar codebase or team: curiosity, caution, and evidence-based change.`,
    answer: () =>
      `"I would resist the urge to change things immediately. First I map the system: what it does, where its complexity lives, and what the team already knows is painful. I look for the smallest change that removes real friction and propose it with data — before/after measurements or a spike. Most improvement is trust: once you ship small wins safely, people let you take on the bigger structural problems."`,
    followUps: () => ["How do you build trust with a team that owns that system?", "How do you measure that an improvement actually helped?", "What kind of change would you never make without buy-in?"],
  },
  {
    category: "general",
    difficulty: "medium",
    question: () => `Do you have any questions for me about the role or the team?`,
    reason: () => `The candidate's questions reveal what they actually care about and how deeply they have thought about the job.`,
    answer: () =>
      `"Yes — I would like to know what the team's biggest win in the past year was and what made it possible, how the team handles on-call or urgent production issues, what the expectations are for the first 90 days in this role, and what the team thinks is the hardest part of the job that is not obvious from the outside."`,
    followUps: () => ["What questions would you ask that are risky to ask late in the process?", "How do you research a company before an interview?", "Which questions show the most insight about a role?"],
  },
  {
    category: "technical",
    difficulty: "hard",
    question: () => `How do you stay current in a field that changes as fast as this one?`,
    reason: () => `Sustainable-growth check: the candidate needs a system for learning, not just enthusiasm.`,
    answer: () =>
      `"I learn best by building, so I keep a rotation of small experiments in areas the industry is moving toward — I pick one thing a quarter, build something real with it, and write down what I learned. I follow a small set of high-signal sources rather than trying to track everything, and I bring what I learn back to work when it is relevant. The goal is not to know every new tool; it is to be able to evaluate them quickly when they matter."`,
    followUps: () => ["What trend are you most skeptical about right now?", "How do you filter signal from noise in this space?", "What have you changed your mind about recently?"],
  },
];

/** Honest source tags per template category (fallback bank is generic, so tags stay conservative). */
const SOURCE_SETS: Record<QuestionCategory, string[]> = {
  technical: ["experience"],
  behavioral: ["experience"],
  project: ["project"],
  job_description: ["job_description"],
  coding: ["experience"],
  system_design: ["experience"],
  data_ml: ["experience"],
  company: ["company", "experience"],
  general: ["general"],
};

function templateSources(t: Template, ctx: GenerationContext): string[] {
  const sources = new Set(SOURCE_SETS[t.category] ?? ["general"]);
  if (t.category === "company" && ctx.company) sources.add("company");
  if (t.category === "project" && ctx.jobDescription) sources.add("job_description");
  return [...sources];
}

/* ------------------- Deterministic resume extraction ------------------- */

const SECTION_HEADERS: Array<{ key: keyof ResumeData; pattern: RegExp }> = [
  { key: "experience", pattern: /^(?:work|professional|employment|career)?\s*experience$/i },
  { key: "education", pattern: /^education$/i },
  { key: "projects", pattern: /^(?:personal |side |key )?projects?$/i },
  { key: "achievements", pattern: /^achievements?$/i },
  { key: "certifications", pattern: /^(?:certifications?|licenses?)$/i },
  { key: "skills", pattern: /^(?:skills?|tech(?:nical)? skills?|technologies)$/i },
];

const TECH_KEYWORDS = [
  "typescript", "javascript", "python", "java", "c++", "c#", "go", "rust", "swift", "kotlin", "php",
  "ruby", "sql", "postgresql", "mysql", "sqlite", "mongodb", "redis", "dynamodb", "graphql", "rest",
  "node", "node.js", "express", "react", "next.js", "nextjs", "angular", "vue", "svelte", "django", "flask",
  "fastapi", "spring", "rails", "tailwind", "html", "css", "docker", "kubernetes", "k8s", "terraform", "aws",
  "gcp", "azure", "firebase", "supabase", "prisma", "kafka", "rabbitmq", "tensorflow", "pytorch", "pandas",
  "numpy", "scikit-learn", "git", "linux", "ci/cd", "jenkins", "figma", "tableau", "excel", "ml", "ai",
] as const;

const HEADER_SECTION_KEY = (line: string): keyof ResumeData | null => {
  const trimmed = line.trim().replace(/:\s*$/, "");
  if (trimmed.length < 2 || trimmed.length > 40) return null;
  for (const { key, pattern } of SECTION_HEADERS) {
    if (pattern.test(trimmed)) return key;
  }
  return null;
};

const cleanBullet = (line: string): string =>
  line
    .replace(/^[-•*▪o]\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

function extractResumeHeuristic(text: string): ResumeData {
  const result: ResumeData = { ...EMPTY_RESUME };
  const lower = text.toLowerCase();

  // Technologies: keyword scan across the whole text (only facts present).
  const technologies: string[] = [];
  for (const kw of TECH_KEYWORDS) {
    if (technologies.length >= 25) break;
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`).test(lower)) technologies.push(kw === "node.js" ? "Node.js" : kw === "next.js" ? "Next.js" : kw === "ml" || kw === "ai" ? kw.toUpperCase() : kw);
  }
  result.technologies = technologies;

  let section: keyof ResumeData | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const key = HEADER_SECTION_KEY(rawLine);
    if (key) {
      section = key;
      continue;
    }
    if (!section) continue;
    const bullet = cleanBullet(rawLine);
    if (bullet.length < 3) continue;
    if (section === "skills") {
      for (const token of bullet.split(/[,;|•\/]|\s+and\s+/)) {
        const t = token.trim();
        if (t.length >= 2 && t.length <= 40 && result.skills.length < 20) result.skills.push(t);
      }
    } else {
      const list = result[section] as string[];
      const cap = section === "experience" ? 12 : section === "projects" ? 8 : 6;
      if (list.length < cap && bullet.length <= 240) list.push(bullet);
    }
  }

  // Dedupe skills case-insensitively, keep first occurrence.
  const seen = new Set<string>();
  result.skills = result.skills.filter((s) => {
    const k = s.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return result;
}

function pick(count: number): Template[] {
  // Rotate through categories so the set has variety regardless of count.
  const ordered = [...TEMPLATES].sort((a, b) => {
    const order: QuestionCategory[] = ["general", "technical", "behavioral", "project", "company"];
    return order.indexOf(a.category) - order.indexOf(b.category) || a.difficulty.localeCompare(b.difficulty);
  });
  const result: Template[] = [];
  for (let i = 0; result.length < count && i < Math.max(count, ordered.length) * 3; i++) {
    const t = ordered[i % ordered.length];
    if (result.some((existing) => existing.category === t.category && existing.difficulty === t.difficulty)) continue;
    result.push(t);
  }
  // Top up with distinct templates if the pool is smaller than count.
  for (const t of ordered) {
    if (result.length >= count) break;
    if (!result.includes(t)) result.push(t);
  }
  return result.slice(0, count);
}

export class FallbackProvider implements AIProvider {
  readonly name = "fallback";

  async generateQuestions(ctx: GenerationContext): Promise<GeneratedQuestion[]> {
    return pick(ctx.count).map((t) => ({
      question: t.question(ctx),
      category: t.category,
      difficulty: t.difficulty,
      reason: t.reason(ctx),
      source_context: templateSources(t, ctx),
      suggested_answer: t.answer(ctx),
      follow_up_questions: t.followUps(ctx).slice(0, 3),
    }));
  }

  async extractResume(text: string): Promise<ResumeData> {
    return extractResumeHeuristic(text);
  }

  async generateFollowUps(ctx: FollowUpContext): Promise<string[]> {
    return [
      `What made you choose that approach for "${ctx.question}"?`,
      "What trade-offs did you consider, and which did you accept?",
      "What would you change if you had to do it again?",
      "How would you measure whether it worked?",
    ].slice(0, 3);
  }

  /** Deterministic mock interviewer: walks the prepared bank, cycles each
   *  question's stored follow-ups after the candidate answers, then ends when
   *  the main-question cap is reached or the bank is exhausted. */
  async driveInterview(ctx: InterviewerContext): Promise<InterviewerDecision> {
    const bank =
      ctx.questionBank.length > 0
        ? ctx.questionBank
        : (await this.generateQuestions({
            role: ctx.role,
            seniority: ctx.seniority,
            company: ctx.company,
            companyType: ctx.companyType,
            interviewType: ctx.interviewType,
            jobDescription: ctx.jobDescription,
            candidateContext: ctx.candidateContext,
            count: ctx.maxQuestions,
          })).map((q) => ({
            question: q.question,
            category: q.category,
            difficulty: q.difficulty,
            followUps: q.follow_up_questions,
          }));

    const aiTurns = ctx.history.filter((t) => t.speaker === "AI");
    const mainAsked = ctx.questionsAsked;

    const closing = () =>
      ({
        action: "end_interview" as const,
        text: `That's all the questions I have for today. Thank you for practicing with InterviewOS — best of luck in your real interview!`,
        category: undefined,
        difficulty: undefined,
        reason: "Question cap reached.",
      }) satisfies InterviewerDecision;

    if (mainAsked >= ctx.maxQuestions || bank.length === 0) return closing();

    // Opening: no AI has spoken yet.
    if (aiTurns.length === 0) {
      const first = bank[0];
      return {
        action: "ask_question",
        text: first.question,
        category: normalizeCategory(first.category),
        difficulty: normalizeDifficulty(first.difficulty),
        reason: "Opening question.",
      };
    }

    // After an answer: use stored follow-ups of the most recent main question
    // before moving on, then ask the next main question from the bank.
    let trailingFollowUps = 0;
    for (let i = aiTurns.length - 1; i >= 0; i--) {
      if (aiTurns[i].action === "ask_followup") trailingFollowUps++;
      else break;
    }
    const current = mainAsked >= 1 ? bank[Math.min(mainAsked - 1, bank.length - 1)] : undefined;
    if (current && trailingFollowUps < current.followUps.length && mainAsked <= ctx.maxQuestions) {
      return {
        action: "ask_followup",
        text: current.followUps[trailingFollowUps],
        category: normalizeCategory(current.category),
        difficulty: normalizeDifficulty(current.difficulty),
        reason: "Probing the candidate's previous answer.",
      };
    }
    if (mainAsked < bank.length) {
      const next = bank[mainAsked];
      return {
        action: mainAsked === 0 ? "ask_question" : "move_topic",
        text: next.question,
        category: normalizeCategory(next.category),
        difficulty: normalizeDifficulty(next.difficulty),
        reason: "Moving to the next prepared question.",
      };
    }
    return closing();
  }

  async evaluateAnswer(ctx: EvaluationContext): Promise<EvaluationResult> {
    const words = ctx.answer.trim().split(/\s+/).length;
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
}
