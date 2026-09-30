import type { CompanyType, JobDescription, Seniority } from "./schema";
import {
  COMPANY_OVERLAY,
  SENIORITY_OVERLAY,
  type RoleSpec,
} from "./roles";

/**
 * Batched OpenRouter generation for the JD seed set.
 *
 * One call per (role × seniority × companyType) combination returns a JSON batch
 * of N original JDs. Originality is explicit in the prompt: the model must not
 * copy, quote, or paraphrase any real posting, and must not name real companies.
 *
 * The role catalog supplies the grounding (stack, themes, focus) so output is
 * specific rather than generic, independent of model size.
 */

export interface FixedAxis {
  role: string;
  seniority: Seniority;
  companyType: CompanyType;
  yearsExperience: JobDescription["yearsExperience"];
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

const SYSTEM_PROMPT = `You generate ORIGINAL, realistic software job descriptions for interview-practice data.

Hard rules:
- You must NOT copy, quote, or paraphrase any real job posting from any platform (LinkedIn, Indeed, Naukri, Glassdoor, etc.). Write from general industry knowledge only. This is a legal requirement.
- Never mention a real company name. Invent no employer names at all.
- Return ONLY valid JSON, no markdown, no commentary.

Output shape (exactly):
{"jobDescriptions":[{"role":string,"seniority":"entry"|"mid"|"senior","companyType":"startup"|"mid-size"|"enterprise","responsibilities":string[3-5],"requiredSkills":string[3-12],"niceToHave":string[2-4],"yearsExperience":"0-2"|"3-5"|"6+","interviewFocusAreas":string[2-3]}]}

Quality rules:
- responsibilities: 3-5 items. Each MUST be role- and scope-specific and describable in one concrete sentence (15-400 chars). No fluff like "write code" or "work on projects".
- requiredSkills: 3-12 entries, each a REAL technology, tool, framework, language, platform or practice specific to this role (e.g. "Go", "PostgreSQL", "Terraform", "Kubernetes", "SwiftUI"). NEVER soft skills or generic words like "programming", "coding", "software", "teamwork", "communication".
- niceToHave: 2-4 entries, plausible differentiators for this role and level.
- interviewFocusAreas: 2-3 areas this role's interview would realistically probe.
- Every variant in the batch must differ in wording, stack emphasis and priorities — not the same JD with a changed title. Vary which responsibilities lead, which tools appear, and how scope is framed.
- Company type must change tone and requirements as instructed; do not merely mention it.`;

/**
 * Distinct work angles. Each variant in a batch is assigned a different angle so
 * the N JDs differ in emphasis, not just wording. This is what makes the set
 * genuinely varied rather than the same JD rephrased.
 */
const ANGLES = [
  "core product feature delivery",
  "performance, scale and reliability",
  "developer experience and internal tooling",
  "testing, quality and correctness",
  "cross-functional collaboration and stakeholder work",
  "migration, modernization and technical debt",
  "architecture and design ownership",
  "data, integration and correctness of flows",
  "security, robustness and compliance",
  "observability, metrics and monitoring",
  "mentorship, standards and code review",
  "customer-facing problem solving and iteration",
  "platformization and reuse across teams",
  "incident response and operational ownership",
  "onboarding, documentation and knowledge sharing",
  "cost, efficiency and resource optimization",
];

function angleAssignments(variants: number): string {
  return Array.from({ length: variants }, (_, i) => `  - Variant ${i + 1}: lead with "${ANGLES[i % ANGLES.length]}"`).join("\n");
}

function buildUserPrompt(spec: RoleSpec, fixed: FixedAxis, variants: number): string {
  return [
    `Role: ${fixed.role}`,
    `Domain: ${spec.domain}`,
    `Seniority: ${fixed.seniority}`,
    `Years of experience: ${fixed.yearsExperience}`,
    `Company type: ${fixed.companyType}`,
    "",
    `Seniority expectation: ${SENIORITY_OVERLAY[fixed.seniority]}`,
    `Company context: ${COMPANY_OVERLAY[fixed.companyType]}`,
    "",
    `Typical technology footprint for this role (draw requiredSkills from REAL tools here; you may add other genuine tools):`,
    spec.stack.join(", "),
    "",
    `Realistic responsibility themes for this role (use and rephrase these; do not invent unrelated work):`,
    spec.themes.map((t) => `- ${t}`).join("\n"),
    "",
    `Interview focus areas this role is typically probed on:`,
    spec.focusAreas.map((f) => `- ${f}`).join("\n"),
    "",
    `Plausible nice-to-have differentiators:`,
    spec.niceToHave.map((n) => `- ${n}`).join("\n"),
    "",
    `Generate exactly ${variants} DISTINCT job descriptions for this exact role/seniority/company-type combination.`,
    `All ${variants} must set role="${fixed.role}", seniority="${fixed.seniority}", companyType="${fixed.companyType}", yearsExperience="${fixed.yearsExperience}".`,
    `interviewFocusAreas: choose 2-3 from the focus areas above (you may phrase them naturally).`,
    ``,
    `Give each variant a DIFFERENT primary emphasis, exactly in this order:`,
    angleAssignments(variants),
    ``,
    `Distinctness rules (critical — these are N different jobs, not one job reworded):`,
    `- Variant i must lead with its assigned angle and draw its responsibilities primarily from different themes than the other variants.`,
    `- Do NOT reuse the same 5 responsibilities across variants. Across the batch, cover the full set of responsibility themes.`,
    `- requiredSkills must be a DIFFERENT subset of the footprint per variant: vary both which tools appear and their order/count (5 to 10 items). Two variants must not share an identical skills list.`,
    `- Vary niceToHave across variants; at least half must differ.`,
    `- Vary sentence structure and opening verbs; avoid a repeated template across the batch.`,
    `- If the assigned angle barely applies (e.g. mentorship for an entry role), keep it secondary and lead with the nearest realistic emphasis instead.`,
    `Return ONLY {"jobDescriptions":[...]}.`,
  ].join("\n");
}

/** Tolerant JSON extraction: strips fences/prose and parses the first object. */
export function extractJson(raw: string): unknown {
  const cleaned = raw
    .replace(/```(?:json)?/gi, "")
    .replace(/^[^{[]*/, "")
    .replace(/[^}\]]*$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("no JSON object in model output");
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

/**
 * Salvage complete objects from a malformed or truncated JSON array.
 *
 * A batch of 12 JDs is a long completion; models occasionally emit one invalid
 * character or get cut off mid-array. Rather than discard the whole batch, this
 * brace-matches every complete top-level object and parses each independently.
 */
export function salvageObjects(text: string): unknown[] {
  const marker = text.indexOf("jobDescriptions");
  const bracketed = text.indexOf("[", marker === -1 ? 0 : marker);
  const from = bracketed === -1 ? text.indexOf("{") : bracketed;
  const objects: unknown[] = [];
  let depth = 0;
  let objStart = -1;
  let inString = false;
  let escape = false;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) objStart = i;
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0 && objStart !== -1) {
        try {
          objects.push(JSON.parse(text.slice(objStart, i + 1)));
        } catch {
          /* skip a single broken object, keep the rest */
        }
        objStart = -1;
      }
    }
  }
  return objects;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const RETRYABLE = /(429|500|502|503|504|rate.?limit|timed out|timeout|ECONNRESET|fetch failed)/i;

async function chatCompletion(
  cfg: ProviderConfig,
  system: string,
  user: string
): Promise<string> {
  const maxAttempts = 5;
  let lastError = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.apiKey}`,
          "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
          "X-Title": "InterviewOS JD Seed",
        },
        body: JSON.stringify({
          model: cfg.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: cfg.temperature ?? 0.9,
          max_tokens: cfg.maxTokens ?? 8_000,
        }),
        signal: AbortSignal.timeout(120_000),
      });

      if (!res.ok) {
        let detail = "";
        try {
          const body = (await res.json()) as { error?: { message?: string } };
          detail = body.error?.message ?? "";
        } catch {
          /* ignore */
        }
        lastError = `HTTP ${res.status}: ${detail || res.statusText}`;
        if (attempt < maxAttempts && RETRYABLE.test(lastError)) {
          await sleep(1_500 * attempt);
          continue;
        }
        throw new Error(lastError);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("empty completion");
      return content;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < maxAttempts && RETRYABLE.test(lastError)) {
        await sleep(1_500 * attempt);
        continue;
      }
      throw err;
    }
  }
  throw new Error(lastError);
}

/**
 * Generate one batch of raw (unvalidated) JD objects. The caller validates each
 * object against the Zod schema.
 */
export async function generateBatch(
  cfg: ProviderConfig,
  spec: RoleSpec,
  fixed: FixedAxis,
  variants: number,
  extraGuidance?: string
): Promise<unknown[]> {
  const user = extraGuidance
    ? `${buildUserPrompt(spec, fixed, variants)}\n\nAdditional guidance: ${extraGuidance}`
    : buildUserPrompt(spec, fixed, variants);

  const raw = await chatCompletion(cfg, SYSTEM_PROMPT, user);

  // 1) clean parse of the whole array when possible
  try {
    const parsed = extractJson(raw) as { jobDescriptions?: unknown; job_descriptions?: unknown };
    const list = Array.isArray(parsed)
      ? parsed
      : parsed?.jobDescriptions ?? parsed?.job_descriptions;
    if (Array.isArray(list) && list.length > 0) return list;
  } catch {
    /* fall through to salvage */
  }

  // 2) salvage complete objects from a truncated / slightly malformed batch
  const salvaged = salvageObjects(raw);
  if (salvaged.length === 0) throw new Error("could not parse any JD objects from model output");
  return salvaged;
}
