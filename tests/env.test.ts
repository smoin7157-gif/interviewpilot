import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertEnv, checkEnv, EnvValidationError, formatEnvProblems, siteUrl } from "../src/lib/env";

/** A fully configured production environment; each test perturbs one value. */
function env(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://user:pw@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require",
    AUTH_SECRET: "0123456789abcdef0123456789abcdef",
    OPENROUTER_API_KEY: "sk-or-v1-test",
    ...overrides,
  };
}

describe("checkEnv", () => {
  it("accepts a fully configured production environment", () => {
    const result = checkEnv(env());
    assert.equal(result.ok, true);
    assert.deepEqual(result.problems, []);
    assert.equal(result.values?.DATABASE_URL, env().DATABASE_URL);
  });

  it("names a variable that is not set at all", () => {
    const source = env();
    delete source.DATABASE_URL;
    const result = checkEnv(source);
    assert.equal(result.ok, false);
    assert.deepEqual(result.problems, ["DATABASE_URL is not set"]);
  });

  it("names a variable that is set to an empty string", () => {
    const result = checkEnv(env({ DATABASE_URL: "" }));
    assert.deepEqual(result.problems, ["DATABASE_URL is set but empty"]);
  });

  it("treats whitespace-only values as empty", () => {
    const result = checkEnv(env({ AUTH_SECRET: "   " }));
    assert.deepEqual(result.problems, ["AUTH_SECRET is set but empty"]);
  });

  it("rejects a DATABASE_URL without a postgres protocol", () => {
    const result = checkEnv(env({ DATABASE_URL: "mysql://user@host/db" }));
    assert.equal(result.ok, false);
    assert.match(result.problems[0], /^DATABASE_URL is set but is not a PostgreSQL connection string/);
  });

  it("rejects a too-short AUTH_SECRET", () => {
    const result = checkEnv(env({ AUTH_SECRET: "short" }));
    assert.equal(result.ok, false);
    assert.match(result.problems[0], /^AUTH_SECRET is set but too short/);
  });

  it("requires OPENROUTER_API_KEY in production", () => {
    const result = checkEnv(env({ OPENROUTER_API_KEY: "" }));
    assert.equal(result.ok, false);
    assert.deepEqual(result.problems, ["OPENROUTER_API_KEY is set but empty"]);
  });

  it("only warns about a missing OPENROUTER_API_KEY in development", () => {
    const result = checkEnv(env({ NODE_ENV: "development", OPENROUTER_API_KEY: "" }));
    assert.equal(result.ok, true);
    assert.deepEqual(result.problems, []);
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /OPENROUTER_API_KEY/);
  });

  it("reports every problem, not just the first", () => {
    const result = checkEnv({ NODE_ENV: "production" });
    assert.equal(result.ok, false);
    assert.deepEqual(result.problems, [
      "DATABASE_URL is not set",
      "AUTH_SECRET is not set",
      "OPENROUTER_API_KEY is not set",
    ]);
  });
});

describe("assertEnv", () => {
  it("returns the validated values", () => {
    const values = assertEnv(env());
    assert.equal(values.DATABASE_URL, env().DATABASE_URL);
  });

  it("throws an EnvValidationError naming the offending variable", () => {
    assert.throws(
      () => assertEnv({ NODE_ENV: "production", AUTH_SECRET: "a".repeat(32), OPENROUTER_API_KEY: "k" }),
      (error: unknown) => {
        assert.ok(error instanceof EnvValidationError);
        assert.deepEqual(error.variables, ["DATABASE_URL"]);
        assert.match(error.message, /DATABASE_URL is not set/);
        return true;
      }
    );
  });
});

describe("formatEnvProblems", () => {
  it("pluralizes the headline", () => {
    assert.match(formatEnvProblems(["A is not set"]), /1 environment problem found/);
    assert.match(formatEnvProblems(["A is not set", "B is not set"]), /2 environment problems found/);
  });
});

/**
 * `siteUrl()` feeds `metadataBase`, the sitemap and the robots file. It is
 * reachable from module scope of the root layout, so it must never throw —
 * a bad optional variable would otherwise 500 every page.
 */
describe("siteUrl", () => {
  it("falls back to localhost when APP_URL is unset, blank or whitespace", () => {
    assert.equal(siteUrl({}), "http://localhost:3000");
    assert.equal(siteUrl({ APP_URL: "" }), "http://localhost:3000");
    assert.equal(siteUrl({ APP_URL: "   " }), "http://localhost:3000");
  });

  it("drops the trailing slash so callers can append paths", () => {
    assert.equal(siteUrl({ APP_URL: "https://interviewos.example.com/" }), "https://interviewos.example.com");
    assert.equal(siteUrl({ APP_URL: "https://interviewos.example.com" }), "https://interviewos.example.com");
  });

  it("assumes https for a bare host (the value pasted from a browser bar)", () => {
    assert.equal(siteUrl({ APP_URL: "interviewos.example.com" }), "https://interviewos.example.com");
  });

  it("keeps a sub-path deployment intact", () => {
    assert.equal(siteUrl({ APP_URL: "https://example.com/interviewos/" }), "https://example.com/interviewos");
  });

  it("never throws on an unusable value", () => {
    assert.equal(siteUrl({ APP_URL: "http://" }), "http://localhost:3000");
    assert.equal(siteUrl({ APP_URL: "not a url at all" }), "http://localhost:3000");
  });

  it("rejects non-http(s) schemes instead of handing back a javascript: base", () => {
    assert.equal(siteUrl({ APP_URL: "javascript:alert(1)" }), "http://localhost:3000");
    assert.equal(siteUrl({ APP_URL: "ftp://example.com" }), "http://localhost:3000");
  });
});
