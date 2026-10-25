import type { JdSeedRef } from "@/lib/jd";
import { extractJdFacts } from "./jd-text";
import type { GenerationContext, QuestionCategory } from "./types";

/**
 * Deterministic JD-grounded question candidates for the offline provider.
 *
 * The fallback's template bank is role-agnostic on purpose; when a seed job
 * description matches the requested role, these candidates let the fallback ask
 * about *that* role's real skills, responsibilities and interview focus areas
 * instead of generic ones. Everything here is composed from the seed data plus
 * the candidate's own setup — no I/O, no network, stable output.
 *
 * When the candidate pasted their own job description, the technologies and
 * duties named in it take precedence over the seed variant's. The seed match
 * only tells us which role the posting belongs to; asking a candidate who
 * pasted a Node/Postgres/TypeScript posting about Java — because the seed
 * Backend Engineer variant lists Java — is a question about the wrong job.
 *
 * The fallback keeps its template selection (category mix, difficulty quotas,
 * cross-session avoidance) and only swaps in the wording, so grounding can
 * never change the shape of a generated set.
 */

export interface JdGroundedQuestion {
  question: string;
  reason: string;
  suggested_answer: string;
  follow_up_questions: string[];
  source_context: string[];
}

export type JdGroundedPool = Map<QuestionCategory, JdGroundedQuestion[]>;

const MAX_SKILLS = 12;
const MAX_RESPONSIBILITIES = 8;
const MAX_FOCUS_AREAS = 6;
const MAX_QUESTION_CHARS = 320;

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

/** "a", "a and b", "a, b and c" — natural spoken enumeration. */
function enumerate(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

function clampQuestion(text: string): string {
  return text.length > MAX_QUESTION_CHARS ? `${text.slice(0, MAX_QUESTION_CHARS - 1)}…` : text;
}

/**
 * A responsibility is a standalone sentence in the seed data ("Own and ship
 * work that…"). Splice it into our sentences as a clause: drop the trailing
 * period and lowercase the lead word, unless it opens with an acronym (API,
 * SQL) that must keep its casing.
 */
function toClause(text: string): string {
  const trimmed = text.trim().replace(/[.\s]+$/, "");
  if (!trimmed) return trimmed;
  const first = trimmed[0];
  const second = trimmed[1] ?? "";
  const isAcronym = first === first.toUpperCase() && second === second.toUpperCase();
  return isAcronym ? trimmed : first.toLowerCase() + trimmed.slice(1);
}

/** Whether the matched role's material actually exercises these categories. */
function roleShape(refs: JdSeedRef[]): { designs: boolean; data: boolean } {
  const corpus = refs
    .flatMap((ref) => [ref.role, ...ref.interviewFocusAreas, ...ref.responsibilities])
    .join(" ")
    .toLowerCase();
  return {
    designs: /(design|architect|scal|reliab|distribut|system|latenc|throughput|concurren|infrastructure)/.test(corpus),
    data: /(data|machine learning|ml\b|ai\b|research|scientist|model|experiment|statistic|pipeline)/.test(corpus),
  };
}

/**
 * Build per-category grounded candidates from the matched seed variants.
 * Duplicate question texts are collapsed so a set can never repeat one.
 */
export function buildJdGroundedPool(ctx: GenerationContext, refs: JdSeedRef[]): JdGroundedPool {
  const role = ctx.role;
  const company = ctx.company;
  const own = extractJdFacts(ctx.jobDescription);

  // Nothing to ground on: neither a seed variant nor anything readable in the
  // candidate's own posting. The caller then keeps the generic template bank.
  if (refs.length === 0 && own.skills.length === 0 && own.responsibilities.length === 0) {
    return new Map();
  }

  // The candidate's own posting wins: its technologies replace the seed
  // variant's entirely (otherwise a stack that is not theirs sneaks back in),
  // and its duties lead the responsibility list, with seed duties only filling
  // the remaining slots so the grounding pool stays deep enough.
  const seedSkills = unique(refs.flatMap((ref) => ref.requiredSkills)).slice(0, MAX_SKILLS);
  const skills = own.skills.length > 0 ? own.skills.slice(0, MAX_SKILLS) : seedSkills;
  const seedResponsibilities = unique(refs.flatMap((ref) => ref.responsibilities)).map(toClause);
  const responsibilities = unique([...own.responsibilities.map(toClause), ...seedResponsibilities]).slice(
    0,
    MAX_RESPONSIBILITIES
  );
  /**
   * Serve duties round-robin rather than giving every category the same first
   * few. A posting that lists two duties used to anchor the project, JD,
   * behavioral and design questions on those same two lines; now each duty
   * grounds at most two candidates, in different categories, and a category
   * never repeats one.
   */
  const dutyUses = new Map<string, number>();
  const MAX_USES_PER_DUTY = 2;
  let dutyCursor = 0;
  const nextDuty = (usedHere: Set<string>): string | null => {
    for (let step = 0; step < responsibilities.length; step++) {
      const index = (dutyCursor + step) % responsibilities.length;
      const duty = responsibilities[index];
      if (usedHere.has(duty)) continue;
      if ((dutyUses.get(duty) ?? 0) >= MAX_USES_PER_DUTY) continue;
      dutyUses.set(duty, (dutyUses.get(duty) ?? 0) + 1);
      dutyCursor = index + 1;
      return duty;
    }
    return null;
  };

  const focusAreas = unique(refs.flatMap((ref) => ref.interviewFocusAreas)).slice(0, MAX_FOCUS_AREAS);
  const seedShape = roleShape(refs);
  // A posting that talks about scaling or pipelines can make design/data
  // questions appropriate even when the seed variant for the role did not.
  const designs = seedShape.designs || own.designs;
  const data = seedShape.data || own.data;

  const pool: JdGroundedPool = new Map();
  const seen = new Set<string>();

  const add = (
    category: QuestionCategory,
    question: string,
    reason: string,
    suggested_answer: string,
    follow_up_questions: string[],
    source_context: string[]
  ) => {
    const text = clampQuestion(question.trim());
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const list = pool.get(category) ?? [];
    list.push({ question: text, reason, suggested_answer, follow_up_questions, source_context });
    pool.set(category, list);
  };

  // Technical — the role's actual stack, one question per core technology.
  for (const skill of skills) {
    add(
      "technical",
      `You'd be working hands-on with ${skill} in this ${role} role — walk me through a specific problem you solved with ${skill} and the trade-offs you weighed.`,
      `${skill} is part of this role's real stack, so depth here is a direct signal.`,
      `"I've used ${skill} on a real project: the situation was [context], and I reached for ${skill} because [reason]. The main trade-off was [trade-off], and the outcome was [measurable result]."`,
      [
        `What would have broken first if you had not used ${skill}?`,
        `Where has ${skill} been the wrong tool, and what did you do?`,
        `How would you decide ${skill} is still the right choice a year from now?`,
      ],
      ["job_description"]
    );
  }

  if (skills.length >= 3) {
    add(
      "technical",
      `This role's stack spans ${enumerate(skills.slice(0, 4))}. How do you decide which tool to reach for, and where have you seen that choice go wrong?`,
      "Tests stack judgment: choosing between the role's real technologies, not reciting them.",
      `"I pick by the constraint that matters most in the situation — correctness, latency, cost or team familiarity. I've reached for the wrong piece before when I optimized for novelty; now I write down the trade-off before committing."`,
      [
        "Which of those would you drop from the stack, and why?",
        "How do you keep a growing stack from becoming a maintenance burden?",
        "When have you introduced a new tool, and how did you de-risk it?",
      ],
      ["job_description"]
    );
  }

  // Focus areas are literally what this role's interview probes.
  for (const focus of focusAreas.slice(0, 4)) {
    add(
      "technical",
      `This interview will probe ${focus}. Talk me through how you have handled that in practice, with one concrete example.`,
      "Mirrors the role's documented interview focus, so practice targets what is actually assessed.",
      `"The situation was [context]. I handled it by [approach], and the result was [outcome]. The part I would refine next time is [detail]."`,
      [
        "What did you get wrong the first time you faced that?",
        "How do you know your approach was better than the alternative?",
        "What would you do differently at a larger scale?",
      ],
      ["job_description"]
    );
  }

  // Project — the candidate's own work, framed by the role's responsibilities.
  const usedInProject = new Set<string>();
  for (let i = 0; i < 4; i++) {
    const responsibility = nextDuty(usedInProject);
    if (!responsibility) break;
    usedInProject.add(responsibility);
    add(
      "project",
      `Walk me through a project where you had to ${responsibility}. What did you personally own, and what was the outcome?`,
      "Connects the candidate's real projects to a responsibility this role actually owns.",
      `"On [project], my responsibility was to ${responsibility}. I owned [specific part], made the call on [decision], and the outcome was [measurable result]. What I would change is [detail]."`,
      [
        "What decision there would you make differently now?",
        "How did you measure whether it worked?",
        "What part did you not own, and how did you collaborate on it?",
      ],
      ["job_description", "project"]
    );
  }

  for (const skill of skills.slice(0, 2)) {
    add(
      "project",
      `Tell me about a project where ${skill} was central — what decisions did you make, and what would you change if you built it again?`,
      "Probes depth in the role's core technology through the candidate's own project.",
      `"${skill} was central to [project]. I chose it because [reason], and the hard part was [challenge]. If I rebuilt it, I would [change]."`,
      [
        `What did ${skill} make harder than expected?`,
        "How did you decide when the project was done?",
        "What did you learn that you reused later?",
      ],
      ["job_description", "project"]
    );
  }

  // Job description — reading and reasoning about the posting itself.
  if (skills.length >= 3) {
    add(
      "job_description",
      `This ${role} description calls for ${enumerate(skills.slice(0, 3))}. Which of those is your strongest, and where have you applied it at this level?`,
      "A direct fit check against the posted requirements, with evidence required.",
      `"${skills[0]} is my strongest of those. I applied it on [project], where [specific work] led to [outcome]. The others I have used less deeply, and I would ramp on them by [plan]."`,
      [
        "Which listed requirement would you need the most time to ramp on?",
        "What on the list have you deliberately avoided, and why?",
        "How do you keep skills fresh that you don't use daily?",
      ],
      ["job_description"]
    );
  }

  const usedInJd = new Set<string>();
  for (let i = 0; i < 3; i++) {
    const responsibility = nextDuty(usedInJd);
    if (!responsibility) break;
    usedInJd.add(responsibility);
    add(
      "job_description",
      `A core responsibility here is to ${responsibility}. Where have you done that before, and what did you learn?`,
      "Checks the candidate can map the posting's actual duties to their own experience.",
      `"I have done that on [project]: I was responsible for ${responsibility}, and the outcome was [result]. The lesson was [takeaway], which I now apply by [habit]."`,
      [
        "What would you need from the team to do that well here?",
        "How would you know you were doing it well after 90 days?",
        "What part of that did you find hardest?",
      ],
      ["job_description"]
    );
  }

  if (skills.length >= 1 && focusAreas.length >= 1) {
    add(
      "job_description",
      `Reading this ${role} description, which requirement — for example ${skills[0]} or ${focusAreas[0]} — would stretch you most today, and how would you close the gap?`,
      "Honest self-assessment against the real posting, with a concrete growth plan.",
      `"The stretch for me would be [requirement], because I have [gap]. My plan is concrete: [step one], [step two], and I would check progress by [signal]."`,
      [
        "How long would you expect that gap to take to close?",
        "What have you already done toward it?",
        "Where else in your career have you closed a similar gap?",
      ],
      ["job_description"]
    );
  }

  // Behavioral — the role's responsibilities as STAR prompts.
  const usedInBehavioral = new Set<string>();
  for (let i = 0; i < 3; i++) {
    const responsibility = nextDuty(usedInBehavioral);
    if (!responsibility) break;
    usedInBehavioral.add(responsibility);
    add(
      "behavioral",
      `Tell me about a time you had to ${responsibility}. What did you do, and what was the result?`,
      "Uses a responsibility this role owns as the STAR scenario, so the story is relevant.",
      `"The situation was [context] and I had to ${responsibility}. My task was [task], so I [action]. The result was [outcome], and I would handle the communication differently next time."`,
      [
        "What did you have to deprioritize to make that happen?",
        "Who did you need to influence, and how?",
        "What would you have done with more time?",
      ],
      ["job_description", "experience"]
    );
  }

  if (skills.length >= 1) {
    add(
      "behavioral",
      `Describe a time you had to make an unpopular call about ${skills[0]} or the way the team worked. How did you handle it?`,
      "Tests professional pushback on a real technology decision, not a generic conflict story.",
      `"I recommended [call] even though the team leaned the other way. I brought [evidence], listened to their concerns, and we agreed to [resolution]. The result was [outcome]."`,
      [
        "What if the team had still disagreed?",
        "How did you keep the relationship intact?",
        "What convinced you that your position was right?",
      ],
      ["job_description", "experience"]
    );
  }

  // System design — only when the role's own material is design-shaped.
  if (designs) {
    const usedInDesign = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const responsibility = nextDuty(usedInDesign);
      if (!responsibility) break;
      usedInDesign.add(responsibility);
      add(
        "system_design",
        `How would you design the pieces needed to ${responsibility}? Walk me through the main components and the first bottleneck you would hit.`,
        "Grounds a design question in a responsibility this role actually owns.",
        `"I would start from the requirements and constraints, then sketch the core components: [components]. The first bottleneck is usually [bottleneck], which I would address by [approach]. I would not over-build before measuring."`,
        [
          "What would you do when that bottleneck moves?",
          "How would you keep the design changeable?",
          "Where would you accept a simpler, less optimal solution?",
        ],
        ["job_description"]
      );
    }
    for (const focus of focusAreas.filter((f) => /(design|architect|scal|reliab|distribut|system|latenc|throughput|concurren)/i.test(f)).slice(0, 2)) {
      add(
        "system_design",
        `This role emphasizes ${focus}. How would you approach that deliberately rather than reacting to it?`,
        "Turns the role's stated design focus into a concrete design discussion.",
        `"I would define the target first — [metric] — then work the levers in order: [lever one], then [lever two]. At each step I re-measure, because the next bottleneck appears right after the first is removed."`,
        [
          "How do you know when to stop optimizing?",
          "What trade-off would you refuse to make?",
          "How would you get the team aligned on that focus?",
        ],
        ["job_description"]
      );
    }
  }

  // Data / ML — only when the role is actually data-shaped.
  if (data) {
    for (const focus of focusAreas.slice(0, 2)) {
      add(
        "data_ml",
        `This role involves ${focus}. How would you measure whether that work is actually succeeding?`,
        "Tests measurement rigor on the role's real data/ML focus rather than a textbook definition.",
        `"I would start from the decision the work is meant to inform, pick a metric that reflects it, and watch for the gap between offline results and real-world behaviour. I would also check the result across slices rather than trusting one aggregate."`,
        [
          "What would make you distrust a good-looking metric?",
          "How do you handle drift after launch?",
          "When is a simpler approach the right call?",
        ],
        ["job_description"]
      );
    }
    if (skills.length >= 1) {
      add(
        "data_ml",
        `How would you decide that a ${skills[0]}-based model or pipeline is good enough to ship, beyond a single accuracy number?`,
        "Checks shipping judgment for the role's real tooling.",
        `"I would anchor on the cost of errors — false positives versus misses — then check performance at the operating threshold, on data the model never saw, and across important slices. Latency and drift matter too: a good model that is slow or stale is not good."`,
        [
          "How would you set the threshold?",
          "What monitoring would you put in place on day one?",
          "What would make you roll it back?",
        ],
        ["job_description"]
      );
    }
  }

  // Company / general — anchored in the role and the target company when known.
  add(
    "company",
    `Given the responsibilities and stack described for this ${role} role${company ? ` at ${company}` : ""}, what attracts you to this kind of work, and where have you done something similar?`,
    "Connects motivation to the actual posting and company rather than a generic pitch.",
    `"What draws me in is [specific part of the work], which matches what I did on [project]. I am looking for [what I want next], and the responsibilities described line up with that."`,
    [
      `What would you want to learn first in a ${role} role?`,
      "How would you approach your first 30 days?",
      "What would make you successful here beyond the description?",
    ],
    company ? ["job_description", "company"] : ["job_description"]
  );

  add(
    "general",
    `Walk me through your background and what makes this ${role} role the right next step for you.`,
    "Opening question tied to the specific role and stack rather than a generic intro.",
    `"I have been building toward ${role} work over [timeframe], most recently by [specific experience]. This role fits because [match to the description], and I am ready for [next challenge]."`,
    [
      "Which part of your background maps most directly to this role?",
      "Where do you want to grow in the next two years?",
      "What did your most recent role teach you about how you work best?",
    ],
    ["job_description", "experience"]
  );

  return pool;
}
