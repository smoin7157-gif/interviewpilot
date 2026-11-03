import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

/**
 * Structured-output repair.
 *
 * The live provider used to throw away a whole paid generation when the model
 * wrapped its JSON in prose or dropped a field. The service then degraded to
 * the deterministic bank, so the candidate silently lost the personalization.
 * One corrective re-ask, carrying the validator's message, should recover the
 * answer without weakening validation.
 */

let OpenRouterProvider: typeof import("../src/lib/ai/openrouter").OpenRouterProvider;

const originalFetch = globalThis.fetch;
let requests: Array<{ system: string; user: string }> = [];

/** Stub OpenRouter with a fixed sequence of message contents (last repeats). */
function stubFetch(contents: string[]): void {
  requests = [];
  let calls = 0;
  globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      messages?: Array<{ role: string; content: string }>;
    };
    const messages = body.messages ?? [];
    requests.push({
      system: messages.find((m) => m.role === "system")?.content ?? "",
      user: messages.find((m) => m.role === "user")?.content ?? "",
    });
    const content = contents[Math.min(calls, contents.length - 1)];
    calls += 1;
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

const validEvaluation = JSON.stringify({
  score: 72,
  strengths: ["Named a concrete metric"],
  missing: ["No trade-off discussed"],
  improvements: ["Close with the measured outcome"],
});

describe("OpenRouter structured output repair", () => {
  before(async () => {
    process.env.OPENROUTER_API_KEY = "test-key-for-repair";
    ({ OpenRouterProvider } = await import("../src/lib/ai/openrouter"));
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    requests = [];
  });

  it("re-asks once with the validation error when the reply is not JSON", async () => {
    stubFetch(["Here is my feedback: the answer was decent, score 85.", validEvaluation]);
    const provider = new OpenRouterProvider();

    const result = await provider.evaluateAnswer({
      prompt: "Explain database indexing and when you would add one.",
      answer: "An index makes lookups faster; I added one on the email column.",
      role: "Backend Engineer",
      seniority: "1–3 years",
    });

    assert.equal(result.score, 72);
    assert.equal(requests.length, 2, "a malformed reply must get exactly one corrective retry");
    assert.match(requests[1].system, /rejected by the response validator/);
    assert.match(requests[1].system, /No JSON object found|failed validation/i);
    assert.equal(requests[1].user, requests[0].user, "the retry must keep the same task input");
  });

  it("does not spend a second call on a valid reply", async () => {
    stubFetch([validEvaluation]);
    const provider = new OpenRouterProvider();

    const result = await provider.evaluateAnswer({
      prompt: "Explain database indexing and when you would add one.",
      answer: "An index makes lookups faster; I added one on the email column.",
      role: "Backend Engineer",
    });

    assert.equal(result.score, 72);
    assert.equal(requests.length, 1);
  });

  it("still throws when the corrected reply is also invalid", async () => {
    stubFetch(["not json", "still not json"]);
    const provider = new OpenRouterProvider();

    await assert.rejects(
      () =>
        provider.evaluateAnswer({
          prompt: "Explain REST.",
          answer: "REST is an architectural style for APIs.",
          role: "Backend Engineer",
        }),
      /No JSON object found|failed validation/
    );
    assert.equal(requests.length, 2, "repair is attempted exactly once");
  });
});
