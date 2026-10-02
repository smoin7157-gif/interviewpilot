import { readFileSync } from "node:fs";
import path from "node:path";
import type { CompanyType, JobDescription, Seniority } from "./schema";

/**
 * Compact, lazy, in-process index over the committed JD seed dataset
 * (`prisma/seed-data/job-descriptions.json`).
 *
 * The dataset is the durable source of truth; the deterministic fallback AI
 * provider reads this index so its questions can be grounded in a real
 * role's responsibilities, skills and interview focus areas — offline, with
 * no DB round-trip and no OpenRouter call.
 *
 * Only the fields the fallback needs are kept in memory, and the file is read
 * once per process (module-level cache). The live OpenRouter path never touches
 * this module.
 */

export interface JdSeedRef {
  role: string;
  seniority: Seniority;
  companyType: CompanyType;
  requiredSkills: string[];
  responsibilities: string[];
  interviewFocusAreas: string[];
}

interface JdIndex {
  /** `${normalizedRole}|${seniority}` → that combination's variants. */
  byRoleSeniority: Map<string, JdSeedRef[]>;
  /** Every normalized catalog role label, used for fuzzy resolution. */
  normalizedRoles: Set<string>;
  /**
   * Whole-word matcher per normalized role, compiled once at index build.
   * Fuzzy role resolution used to compile a fresh RegExp for every role on
   * every lookup; the catalog is static, so the patterns are precomputed.
   */
  roleMatchers: Map<string, RegExp>;
}

const SEED_PATH = path.join(process.cwd(), "prisma", "seed-data", "job-descriptions.json");

let cached: JdIndex | null = null;

/** Lowercase, punctuation-free, single-spaced form used for role matching. */
function normalizeRoleLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word pattern for `needle` inside a normalized, single-spaced string. */
function wholeWordPattern(needle: string): RegExp {
  return new RegExp(`(?:^| )${escapeRegExp(needle)}(?: |$)`);
}

function buildIndex(): JdIndex {
  const raw = JSON.parse(readFileSync(SEED_PATH, "utf8")) as JobDescription[];
  const byRoleSeniority = new Map<string, JdSeedRef[]>();
  const normalizedRoles = new Set<string>();

  for (const jd of raw) {
    const normalizedRole = normalizeRoleLabel(jd.role);
    normalizedRoles.add(normalizedRole);
    const key = `${normalizedRole}|${jd.seniority}`;
    const list = byRoleSeniority.get(key) ?? [];
    list.push({
      role: jd.role,
      seniority: jd.seniority,
      companyType: jd.companyType,
      requiredSkills: jd.requiredSkills,
      responsibilities: jd.responsibilities,
      interviewFocusAreas: jd.interviewFocusAreas,
    });
    byRoleSeniority.set(key, list);
  }

  const roleMatchers = new Map<string, RegExp>();
  for (const normalizedRole of normalizedRoles) {
    roleMatchers.set(normalizedRole, wholeWordPattern(normalizedRole));
  }

  return { byRoleSeniority, normalizedRoles, roleMatchers };
}

/**
 * The dataset is optional at runtime: if the JSON is missing from the deployed
 * bundle (or unreadable), the fallback must degrade to its template bank rather
 * than break generation. An empty index makes every lookup a no-op.
 */
function index(): JdIndex {
  if (cached) return cached;
  try {
    cached = buildIndex();
  } catch (err) {
    console.warn(`[jd] seed index unavailable: ${err instanceof Error ? err.message : String(err)}`);
    cached = { byRoleSeniority: new Map(), normalizedRoles: new Set(), roleMatchers: new Map() };
  }
  return cached;
}

/**
 * Map InterviewOS experience levels onto the seed dataset's three seniorities.
 * Accepts the stored vocabulary ("Fresher", "0–1 years", …) and common
 * spellings; returns null for anything unrecognized so callers fall through.
 */
export function toSeedSeniority(seniority: string): Seniority | null {
  const s = seniority
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ");
  if (!s) return null;
  if (/^(fresher|entry|intern|graduate|junior|0-1 years?|0 to 1 years?)$/.test(s)) return "entry";
  if (/^(mid|mid-level|intermediate|1-3 years?|3-5 years?|1 to 3 years?|3 to 5 years?)$/.test(s)) return "mid";
  if (/^(senior|staff|lead|principal|5\+ years?|6\+ years?|5\+|6\+)$/.test(s)) return "senior";
  return null;
}

/** Map InterviewOS company types onto the seed dataset's three categories. */
export function toSeedCompanyType(companyType?: string): CompanyType | null {
  if (!companyType) return null;
  const t = companyType.trim().toLowerCase();
  if (!t) return null;
  if (t.includes("startup")) return "startup";
  if (t.includes("mnc") || t.includes("enterprise") || t.includes("consult")) return "enterprise";
  if (t.includes("service") || t.includes("product") || t.includes("mid")) return "mid-size";
  return null;
}

/**
 * Resolve free-text role input to a catalog role. Exact normalized match wins;
 * otherwise the longest catalog label contained in (or containing) the input,
 * so "Senior Backend Engineer" resolves to "Backend Engineer".
 *
 * The catalog-side matchers are precompiled on the index; the query-side
 * pattern is built once per lookup instead of once per role.
 */
function resolveRole(normalizedQuery: string, index: JdIndex): string | null {
  const { normalizedRoles, roleMatchers } = index;
  if (!normalizedQuery || normalizedRoles.size === 0) return null;
  if (normalizedRoles.has(normalizedQuery)) return normalizedQuery;

  const queryMatcher = wholeWordPattern(normalizedQuery);
  let best: string | null = null;
  for (const role of normalizedRoles) {
    const roleMatcher = roleMatchers.get(role);
    if (!roleMatcher) continue;
    if (!roleMatcher.test(normalizedQuery) && !queryMatcher.test(role)) continue;
    if (best === null || role.length > best.length) best = role;
  }
  return best;
}

/**
 * Memoized lookups. The seed index is immutable and resolution is a pure
 * function of (role, seniority, companyType), so repeat generations for a
 * common role skip both fuzzy matching and company-type filtering. Capped so a
 * stream of arbitrary free-text roles can't grow the map without bound.
 */
const LOOKUP_CACHE_LIMIT = 500;
const lookupCache = new Map<string, JdSeedRef[]>();

/**
 * Seed JD variants matching a role + experience level (and company type when it
 * maps to a seed category). Returns [] when the role, seniority or dataset is
 * unavailable — callers then use their generic bank.
 */
export function findJdRefs(role: string, seniority: string, companyType?: string): JdSeedRef[] {
  const seniorityEnum = toSeedSeniority(seniority);
  if (!seniorityEnum) return [];

  const normalizedQuery = normalizeRoleLabel(role);
  const companyKey = (companyType ?? "").trim().toLowerCase();
  const cacheKey = `${normalizedQuery}|${seniorityEnum}|${companyKey}`;
  const cachedRefs = lookupCache.get(cacheKey);
  if (cachedRefs) return cachedRefs;

  const idx = index();
  const resolved = resolveRole(normalizedQuery, idx);
  if (!resolved) return [];

  const refs = idx.byRoleSeniority.get(`${resolved}|${seniorityEnum}`);
  if (!refs || refs.length === 0) return [];

  const wantedCompanyType = toSeedCompanyType(companyType);
  const result = wantedCompanyType
    ? (() => {
        const filtered = refs.filter((ref) => ref.companyType === wantedCompanyType);
        return filtered.length > 0 ? filtered : refs;
      })()
    : refs;

  if (lookupCache.size >= LOOKUP_CACHE_LIMIT) lookupCache.clear();
  lookupCache.set(cacheKey, result);
  return result;
}
