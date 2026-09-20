import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

/**
 * Service-layer fallback routing tests.
 *
 * The fallback provider itself is covered by fallback.test.ts; these tests
 * prove the SERVICE layer actually routes to it for all six AI entry points
 * when the primary (OpenRouter) call fails.
 *
 * OpenRouterProvider captures API_KEY at module load, so the key must be set
 * before the module graph is imported. Each test then patches one prototype
 * method to throw (as a real network/HTTP failure would) and asserts the
 * service returns a schema-valid result from the fallback provider.
 */

let service: typeof import("../src/lib/ai/service");
let OpenRouterProvider: typeof import("../src/lib/ai/openrouter").OpenRouterProvider;

before(async () => {
  process.env.OPENROUTER_API_KEY = "test-key-for-fallback-routing";
  service = await import("../src/lib/ai/service");
  ({ OpenRouterProvider } = await import("../src/lib/ai/openrouter"));
});

/** Run `run` with one OpenRouterProvider prototype method replaced by `impl`. */
async function withPatchedMethod<T>(
  method: string,
  impl: (...args: unknown[]) => Promise<unknown>,
  run: () => Promise<T>
): Promise<T> {
  const proto = OpenRouterProvider.prototype as unknown as Record<
    string,
    (...args: unknown[]) => Promise<unknown>
  >;
  const original = proto[method];
  proto[method] = impl;
  try {
    return await run();
  } finally {
    proto[method] = original;
  }
}

/** Non-retryable failure (400) — skips the backoff sleep entirely. */
const permanentFailure = async () => {
  throw new Error("OpenRouter request failed (400): invalid request");
};

describe("service fallback routing (OpenRouter failure → FallbackProvider)", () => {
  it("generateQuestions falls back with schema-valid questions", async () => {
    await withPatchedMethod("generateQuestions", permanentFailure, async () => {
      const result = await service.generateQuestions({
        role: "Backend Engineer",
        seniority: "1–3 years",
        count: 4,
      });
      assert.equal(result.provider, "fallback");
      assert.equal(result.questions.length, 4);
      for (const q of result.questions) {
        assert.ok(q.question.length > 0);
        assert.ok(q.reason.length > 0);
        assert.ok(q.suggested_answer.length > 0);
        assert.ok(Array.isArray(q.follow_up_questions));
        assert.ok(Array.isArray(q.source_context));
      }
    });
  });

  it("generateQuestions falls back when OpenRouter returns an empty set", async () => {
    await withPatchedMethod("generateQuestions", async () => [], async () => {
      const result = await service.generateQuestions({
        role: "Backend Engineer",
        seniority: "1–3 years",
        count: 3,
      });
      assert.equal(result.provider, "fallback");
      assert.equal(result.questions.length, 3);
    });
  });

  it("generateFollowUps falls back with three follow-ups", async () => {
    await withPatchedMethod("generateFollowUps", permanentFailure, async () => {
      const result = await service.generateFollowUps({
        question: "How do you design a rate limiter?",
        role: "Backend Engineer",
        seniority: "1–3 years",
      });
      assert.equal(result.provider, "fallback");
      assert.equal(result.followUps.length, 3);
      for (const f of result.followUps) assert.ok(typeof f === "string" && f.length > 0);
    });
  });

  it("evaluateAnswer falls back with a 0–100 score and feedback arrays", async () => {
    await withPatchedMethod("evaluateAnswer", permanentFailure, async () => {
      const { result, provider } = await service.evaluateAnswer({
        prompt: "Explain database indexing.",
        answer: "I would start with the query pattern, then... for example in my last project...",
        role: "Backend Engineer",
      });
      assert.equal(provider, "fallback");
      assert.ok(result.score >= 0 && result.score <= 100);
      assert.ok(Array.isArray(result.strengths) && result.strengths.length > 0);
      assert.ok(Array.isArray(result.missing));
      assert.ok(Array.isArray(result.improvements) && result.improvements.length > 0);
    });
  });

  it("extractResumeData falls back to the deterministic extractor", async () => {
    await withPatchedMethod("extractResume", permanentFailure, async () => {
      const { result, provider } = await service.extractResumeData(
        "SKILLS\nTypeScript, React, PostgreSQL\n\nEXPERIENCE\n- Built a billing service used by 5k customers"
      );
      assert.equal(provider, "fallback");
      assert.ok(Array.isArray(result.technologies));
      assert.ok(Array.isArray(result.skills) && result.skills.length > 0);
      assert.ok(Array.isArray(result.experience) && result.experience.length > 0);
    });
  });

  it("driveInterview falls back with a valid interviewer action", async () => {
    await withPatchedMethod("driveInterview", permanentFailure, async () => {
      const { decision, provider } = await service.driveInterview({
        role: "Backend Engineer",
        seniority: "1–3 years",
        questionsAsked: 0,
        maxQuestions: 5,
        history: [],
        questionBank: [
          {
            question: "Walk me through your background.",
            category: "general",
            difficulty: "easy",
            followUps: ["What drew you to backend work?"],
          },
        ],
      });
      assert.equal(provider, "fallback");
      assert.ok(
        ["ask_question", "ask_followup", "move_topic", "end_interview"].includes(decision.action)
      );
      assert.ok(decision.text.length > 0);
    });
  });

  it("generateDebrief falls back with a 6-dimension breakdown", async () => {
    await withPatchedMethod("generateDebrief", permanentFailure, async () => {
      const { result, provider } = await service.generateDebrief({
        role: "Backend Engineer",
        seniority: "1–3 years",
        maxQuestions: 5,
        transcript: [
          { speaker: "AI", text: "Explain database indexing.", action: "ask_question", category: "technical", difficulty: "medium" },
          {
            speaker: "CANDIDATE",
            text: "An index is a data structure that makes lookups faster. For example, in my last project we added a composite index and the result was queries dropping from seconds to milliseconds.",
          },
        ],
      });
      assert.equal(provider, "fallback");
      assert.ok(result.overallScore >= 0 && result.overallScore <= 100);
      assert.equal(result.breakdown.length, 6);
      assert.ok(result.strengths.length > 0);
      assert.ok(result.weaknesses.length > 0);
      assert.ok(result.recommendedPractice.length > 0);
    });
  });

  it("retries once on a transient 429 before giving up on the primary", async () => {
    let calls = 0;
    const result = await withPatchedMethod(
      "evaluateAnswer",
      async () => {
        calls++;
        if (calls === 1) throw new Error("OpenRouter request failed (429): rate limited");
        return { score: 82, strengths: ["Direct"], missing: [], improvements: [] };
      },
      () =>
        service.evaluateAnswer({
          prompt: "Explain REST.",
          answer: "REST is an architectural style for APIs. First, resources...",
          role: "Backend Engineer",
        })
    );
    assert.equal(calls, 2, "transient failure must be retried exactly once");
    assert.equal(result.provider, "openrouter");
    assert.equal(result.result.score, 82);
  });

  it("does not retry permanent failures — falls back immediately", async () => {
    let calls = 0;
    const { provider } = await withPatchedMethod(
      "evaluateAnswer",
      async () => {
        calls++;
        throw new Error("OpenRouter request failed (400): bad request");
      },
      () =>
        service.evaluateAnswer({
          prompt: "Explain REST.",
          answer: "REST is an architectural style for APIs.",
          role: "Backend Engineer",
        })
    );
    assert.equal(calls, 1, "a 400 must not be retried");
    assert.equal(provider, "fallback");
  });
});
