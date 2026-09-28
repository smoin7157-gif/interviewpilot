import { z } from "zod";

/**
 * Startup environment contract.
 *
 * Vercel bakes environment variables into a deployment when it is built, so a
 * variable that is missing — or, worse, present but set to an empty string —
 * is only discoverable at runtime. It used to surface as a generic 500 on the
 * first request that touched the database or signed a cookie.
 *
 * `assertEnv()` runs once from `src/instrumentation.ts`, before the server
 * accepts traffic, so a misconfigured deploy fails with a message that names
 * the offending variable instead of failing request by request.
 *
 * Diagnostics describe the variable's SHAPE only (set? empty? right protocol?)
 * — never its value, so secrets stay out of logs.
 */

const POSTGRES_PROTOCOL = /^postgres(ql)?:\/\//i;
const MIN_AUTH_SECRET_LENGTH = 16;

/** Absent, empty, or whitespace-only all count as "not configured". */
function present(name: string) {
  return z
    .string({ error: `${name} is not set` })
    .trim()
    .min(1, `${name} is set but empty`);
}

function databaseUrl() {
  return present("DATABASE_URL").refine(
    (value) => POSTGRES_PROTOCOL.test(value),
    "DATABASE_URL is set but is not a PostgreSQL connection string (expected postgresql:// or postgres://)"
  );
}

function authSecret() {
  return present("AUTH_SECRET").min(
    MIN_AUTH_SECRET_LENGTH,
    `AUTH_SECRET is set but too short — use at least ${MIN_AUTH_SECRET_LENGTH} random characters to sign session cookies`
  );
}

/**
 * The schema for one environment.
 *
 * `DATABASE_URL` and `AUTH_SECRET` are always required. `OPENROUTER_API_KEY` is
 * required in production — a deploy without it quietly serves fallback
 * questions — but optional in development, where the built-in question bank is
 * a feature rather than a misconfiguration. That case is reported as a warning
 * instead of a failure.
 */
export function envSchema(production: boolean) {
  return z.object({
    DATABASE_URL: databaseUrl(),
    AUTH_SECRET: authSecret(),
    OPENROUTER_API_KEY: production ? present("OPENROUTER_API_KEY") : z.string().trim().default(""),
  });
}

/** Env-shaped input the checks read; defaults to `process.env`. */
export type EnvSource = Record<string, string | undefined>;

export type EnvValues = z.infer<ReturnType<typeof envSchema>>;

export interface EnvCheck {
  ok: boolean;
  /** Parsed values — only present when `ok`. */
  values: EnvValues | null;
  /** Fatal problems; each message names the offending variable. */
  problems: string[];
  /** Non-fatal notes (development only). */
  warnings: string[];
}

const MISSING_AI_KEY_WARNING =
  "OPENROUTER_API_KEY is not set — live AI is off and the built-in question bank is used instead.";

/** Validate an environment (defaults to `process.env`) without throwing. */
export function checkEnv(source: EnvSource = process.env): EnvCheck {
  const production = source.NODE_ENV === "production";
  const warnings =
    !production && !source.OPENROUTER_API_KEY?.trim() ? [MISSING_AI_KEY_WARNING] : [];
  const parsed = envSchema(production).safeParse(source);

  if (parsed.success) {
    return { ok: true, values: parsed.data, problems: [], warnings };
  }

  // Zod phrases every issue as "<VAR> …". A variable can raise several issues
  // at once ("empty" and "too short" both apply to an empty AUTH_SECRET), so
  // keep the first — most specific — issue per variable, in field order.
  const seen = new Set<string>();
  const problems: string[] = [];
  for (const issue of parsed.error.issues) {
    const variable = String(issue.path[0] ?? issue.message);
    if (seen.has(variable)) continue;
    seen.add(variable);
    problems.push(issue.message);
  }
  return { ok: false, values: null, problems, warnings };
}

/** Renders problems as a multi-line, copy-pasteable startup failure. */
export function formatEnvProblems(problems: string[]): string {
  const heading =
    problems.length === 1
      ? "InterviewOS cannot start — 1 environment problem found:"
      : `InterviewOS cannot start — ${problems.length} environment problems found:`;
  return [
    heading,
    ...problems.map((problem) => `  • ${problem}`),
    "",
    "Locally: copy .env.example to .env and fill in the values.",
    "On Vercel: set them under Settings → Environment Variables — values are baked in when a deployment is built, so create a NEW deployment (push a commit or click \"Redeploy\") after fixing them.",
  ].join("\n");
}

export class EnvValidationError extends Error {
  readonly problems: string[];
  /** Variable names parsed off the front of each problem message. */
  readonly variables: string[];

  constructor(problems: string[]) {
    super(formatEnvProblems(problems));
    this.name = "EnvValidationError";
    this.problems = problems;
    this.variables = problems.map((problem) => problem.split(" ")[0]);
  }
}

/**
 * Fail fast: return the validated values, or throw with a message naming every
 * variable that needs attention.
 */
export function assertEnv(source: EnvSource = process.env): EnvValues {
  const result = checkEnv(source);
  for (const warning of result.warnings) {
    console.warn(`[env] ${warning}`);
  }
  if (!result.ok || !result.values) {
    throw new EnvValidationError(result.problems);
  }
  return result.values;
}
