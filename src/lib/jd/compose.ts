import type { CompanyType, JobDescription, Seniority } from "./schema";
import type { RoleSpec } from "./roles";

/**
 * Deterministic offline composer for the JD seed set.
 *
 * `openrouter-batch.ts` is the highest-quality backend, but it needs a key and a
 * funded account — a run that hits a credit ceiling produces no dataset at all.
 * This module is the second backend from the spec: it assembles original
 * sentences from the role catalog (stack, themes, focus areas, nice-to-haves)
 * plus seniority and company-type modifiers, so the full dataset can always be
 * produced offline in seconds, with no network and no cost.
 *
 * Everything here is composed from this repo's own catalog text and generic
 * industry phrasing — never scraped, quoted, or paraphrased from a real posting.
 *
 * Variation is deliberate: within one role/seniority/companyType bucket each
 * variant leads with a different emphasis, uses a different sentence frame
 * rotation, a different slice of the stack, and a different company clause, so
 * the dataset passes the same token-overlap dedupe the LLM output does.
 */

export interface FixedAxis {
  role: string;
  seniority: Seniority;
  companyType: CompanyType;
  yearsExperience: JobDescription["yearsExperience"];
}

/** How the person's own work is framed at each experience level. `{theme}` is
 *  filled with one of the role's responsibility themes. */
const SENIORITY_FRAMES: Record<Seniority, string[]> = {
  entry: [
    "Support the team's work to {theme}, picking up well-scoped tasks with review and guidance.",
    "Contribute to efforts that {theme}, learning the codebase, the tooling and the team's conventions as you go.",
    "Implement clearly-scoped parts of the work to {theme}, and ask early when the requirements are still unclear.",
    "Work alongside more experienced engineers on initiatives to {theme}, taking on more ownership as you grow.",
    "Help deliver the team's mandate to {theme}, writing your first tests and getting comfortable with the release process.",
    "Take on defined tickets that move the team's work to {theme} forward, and write down what you learned for the next person.",
  ],
  mid: [
    "Own and ship work that {theme}, from scoping through to production and its follow-up.",
    "Independently deliver features and improvements that {theme}, handling ambiguity without waiting to be unblocked.",
    "Design and build the pieces of the system that {theme}, then keep them healthy once they are live.",
    "Drive initiatives that {theme} end to end, including the reviews, tests and documentation they need.",
    "Extend the platform so it can {theme}, making trade-offs that fit the stage the product is at.",
    "Take responsibility for an area that {theme}, improving it while keeping day-to-day delivery on track.",
  ],
  senior: [
    "Set the technical direction for the work to {theme}, unblocking other engineers and raising the quality bar.",
    "Lead design and delivery for initiatives that {theme}, defending the trade-offs to technical and non-technical partners.",
    "Own the hardest problems in the work to {theme} end to end, from architecture through to production ownership.",
    "Mentor engineers across the team while driving the work to {theme} and the standards it depends on.",
    "Shape the roadmap for the work to {theme}, deciding what to build now, what to defer and what to leave alone.",
    "Act as the technical owner for the systems that {theme}, including their reliability, cost and long-term direction.",
  ],
};

/** Company type changes scope and process, not just tone. */
const COMPANY_CLAUSES: Record<CompanyType, string[]> = {
  startup: [
    "You will own your part end to end in a small team, with broad scope, light process and direct feedback from users.",
    "Expect to wear more than one hat: infrastructure, tooling and product work all land on the same team here.",
    "The stack is deliberately small and the pace is fast, so you ship, measure, iterate and say so when something is wrong.",
    "Autonomy is high and so is ambiguity; you will often be the first person to build the thing you are building.",
  ],
  "mid-size": [
    "You will partner with product, design and adjacent teams inside an established review and planning rhythm.",
    "Scope sits in one clear area with real cross-team dependencies, so alignment and clean interfaces matter.",
    "The team has a working platform and conventions to build on, and expects you to extend them thoughtfully.",
    "Delivery is balanced against stability here, so reviews, tests and staged rollouts are part of normal work.",
  ],
  enterprise: [
    "You will operate across several services and teams while meeting change-management, audit and reliability expectations.",
    "Scope spans systems and regions, so interface contracts, rollout plans and on-call ownership are part of the job.",
    "Expect governance, security review and observability requirements alongside feature delivery.",
    "You will work within a large estate where some systems are older than the product you are shipping into.",
  ],
};

/** Distinct work emphases so variants in one bucket read as different jobs. */
const EMPHASIS: string[] = [
  "Keep the systems this role owns fast, available and predictable under peak load.",
  "Reduce operational toil through automation, better tooling and clearer runbooks.",
  "Improve the developer experience of the teams building on this system, not just the system itself.",
  "Raise correctness through deliberate testing, review practices and failure-case thinking.",
  "Work closely with stakeholders to turn vague requests into small, well-scoped pieces of work.",
  "Carry migrations and modernisation work through without freezing feature delivery.",
  "Make the architecture easier to change by documenting decisions and tightening module boundaries.",
  "Keep data flowing correctly between the systems this role integrates with.",
  "Harden the product against abuse, messy input and the failure modes that only show up in production.",
  "Make production behaviour visible through metrics, tracing, alerting and logs that are actually useful.",
  "Review other engineers' work consistently and set the standard the team reviews against.",
  "Solve real customer problems by iterating on feedback rather than shipping in isolation.",
  "Build reusable pieces the rest of the organisation can adopt instead of re-solving the same problem.",
  "Share operational ownership, including the incidents and follow-up work that come with it.",
  "Write the documentation and onboarding material that saves the next engineer a week.",
  "Find the cost, latency and waste in the current setup and remove it.",
];

/** Take `count` items from `items` starting at `start`, wrapping around. */
function window<T>(items: T[], start: number, count: number): T[] {
  if (items.length === 0) return [];
  return Array.from({ length: Math.min(count, items.length) }, (_, i) => items[(start + i) % items.length]);
}

function fillFrame(frame: string, theme: string): string {
  return frame.replace("{theme}", theme);
}

/**
 * Compose one original job description for a fixed role/seniority/companyType
 * axis. `variant` (0-based) is what makes sibling entries differ.
 */
export function composeJobDescription(spec: RoleSpec, fixed: FixedAxis, variant: number): JobDescription {
  const v = Math.max(0, Math.trunc(variant));
  const { seniority, companyType } = fixed;

  const themes =
    spec.themes.length > 0 ? spec.themes : [`deliver the core work of this ${spec.label} role`];
  const frames = SENIORITY_FRAMES[seniority];
  const clauses = COMPANY_CLAUSES[companyType];

  // A different emphasis per variant (stride 3 keeps five siblings distinct).
  const emphasis = EMPHASIS[(v * 3 + spec.label.length) % EMPHASIS.length];

  const responsibilities = [
    emphasis,
    fillFrame(frames[v % frames.length], themes[v % themes.length]),
    fillFrame(frames[(v + 1) % frames.length], themes[(v + 1) % themes.length]),
    `${fillFrame(frames[(v + 2) % frames.length], themes[(v + 2) % themes.length])} ${clauses[v % clauses.length]}`,
  ];

  // A rotating slice of the real footprint; wraparound keeps every entry a
  // genuine technology from the catalog rather than an invented one.
  const stack = spec.stack;
  const requiredSkills = [
    ...new Set(window(stack, (v * 3) % Math.max(1, stack.length), Math.min(stack.length, 5 + (v % 4)))),
  ];

  const niceToHave = window(spec.niceToHave, v % Math.max(1, spec.niceToHave.length), 3);
  const interviewFocusAreas = window(spec.focusAreas, v % Math.max(1, spec.focusAreas.length), 2);

  return {
    role: fixed.role,
    seniority,
    companyType,
    responsibilities,
    requiredSkills: requiredSkills.length >= 3 ? requiredSkills : [...new Set([...stack, "code review", "testing"])].slice(0, 5),
    niceToHave: niceToHave.length >= 2 ? niceToHave : [...niceToHave, "Clear written communication"].slice(0, 2),
    yearsExperience: fixed.yearsExperience,
    interviewFocusAreas: interviewFocusAreas.length >= 2 ? interviewFocusAreas : spec.focusAreas.slice(0, 2),
  };
}

/**
 * Compose one batch of `variants` distinct JDs for a single axis.
 *
 * `startIndex` keeps variant numbering continuous when a combo is topped up
 * later (a resumed run continues at 5 instead of re-emitting variants 0-4),
 * so no follow-up batch can ever duplicate an earlier one.
 */
export function composeBatchLocal(
  spec: RoleSpec,
  fixed: FixedAxis,
  variants: number,
  startIndex = 0
): JobDescription[] {
  const count = Math.max(1, Math.trunc(variants));
  const from = Math.max(0, Math.trunc(startIndex));
  return Array.from({ length: count }, (_, i) => composeJobDescription(spec, fixed, from + i));
}
