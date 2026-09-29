import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FallbackProvider } from "../src/lib/ai/fallback";
import {
  buildGenerationUserPrompt,
  BOILERPLATE_QUESTIONS,
  GENERATION_SYSTEM_PROMPT,
  targetCategoryMix,
} from "../src/lib/ai/prompts";
import type { GenerationContext } from "../src/lib/ai/types";

/**
 * Golden test set for question generation.
 *
 * A fixed set of resume + job-description profiles with expected quality
 * properties. Two layers guard against a prompt change silently degrading
 * output:
 *  1. Deterministic contract checks on the prompt itself (always run) — the
 *     anti-boilerplate rule, the computed per-type category mix, and the
 *     context-grounding requirement must all survive an edit.
 *  2. Optional live run (GOLDEN_LIVE=1 + OPENROUTER_API_KEY) that actually
 *     generates questions against the fixtures and flags boilerplate, invalid
 *     categories, or questions that ignore the supplied context.
 */

interface GoldenFixture {
  name: string;
  ctx: GenerationContext;
  /** At least one generated question should land in this category. */
  expectCategory?: string;
}

const GOLDEN_FIXTURES: GoldenFixture[] = [
  {
    name: "senior backend, technical JD",
    ctx: {
      role: "Senior Backend Engineer",
      seniority: "5+ years",
      company: "Stripe-like PayCo",
      companyType: "Product Company",
      interviewType: "Technical",
      jobDescription:
        "Own the payments ledger service in Go. Lead schema migrations on PostgreSQL, reduce p99 latency, and drive idempotency design across services.",
      candidateContext:
        "- Skills: Go, PostgreSQL, Kafka\n- Experience: Led a payments migration handling 4M daily transactions\n- Project: Built an idempotency layer for a fintech API",
      count: 10,
    },
    expectCategory: "technical",
  },
  {
    name: "mid frontend, resume-grounded",
    ctx: {
      role: "Frontend Engineer",
      seniority: "1–3 years",
      interviewType: "General",
      jobDescription: "Build accessible React dashboards, own design-system components, improve Core Web Vitals.",
      candidateContext:
        "- Skills: React, TypeScript, Tailwind\n- Project: Rebuilt a charting library that cut bundle size 40%",
      count: 10,
    },
    expectCategory: "project",
  },
  {
    name: "system design interview",
    ctx: {
      role: "Staff Software Engineer",
      seniority: "5+ years",
      interviewType: "System Design",
      jobDescription: "Design multi-region, highly available event ingestion at millions of events per second.",
      count: 10,
    },
    expectCategory: "system_design",
  },
  {
    name: "coding interview for early career",
    ctx: {
      role: "Software Engineer",
      seniority: "0–1 years",
      interviewType: "Coding",
      jobDescription: "Write clean data-structure and algorithm code, test it, and explain complexity.",
      count: 10,
    },
    expectCategory: "coding",
  },
  {
    name: "data/ML role",
    ctx: {
      role: "Machine Learning Engineer",
      seniority: "3–5 years",
      interviewType: "Data / ML",
      jobDescription: "Train, evaluate and deploy recommendation models; monitor drift and offline/online metric gaps.",
      candidateContext: "- Experience: Shipped a ranking model that lifted CTR 12%\n- Technologies: PyTorch, Spark",
      count: 10,
    },
    expectCategory: "data_ml",
  },
  {
    name: "behavioral / recruiter screen",
    ctx: {
      role: "Product Manager",
      seniority: "3–5 years",
      interviewType: "Behavioral",
      jobDescription: "Own roadmap, align engineering and design, and drive cross-functional delivery.",
      count: 10,
    },
    expectCategory: "behavioral",
  },
  {
    name: "fresher general",
    ctx: {
      role: "Junior Developer",
      seniority: "Fresher",
      interviewType: "General",
      count: 10,
    },
    expectCategory: "general",
  },
];

const VALID_CATEGORIES = [
  "technical",
  "behavioral",
  "project",
  "job_description",
  "coding",
  "system_design",
  "data_ml",
  "company",
  "general",
];

const isBoilerplate = (question: string): boolean => {
  const q = question.toLowerCase();
  return BOILERPLATE_QUESTIONS.some((phrase) => q.includes(phrase));
};

describe("golden set: generation prompt contract", () => {
  it("keeps the anti-boilerplate and grounding rules in the system prompt", () => {
    assert.match(GENERATION_SYSTEM_PROMPT, /No boilerplate/i);
    assert.match(GENERATION_SYSTEM_PROMPT, /Ground the set in the provided context/i);
    assert.match(GENERATION_SYSTEM_PROMPT, /Target category mix|exact target distribution/i);
  });

  it("carries the job description, candidate context, mix and grounding target", () => {
    const fixture = GOLDEN_FIXTURES[0].ctx;
    const prompt = buildGenerationUserPrompt(fixture);
    assert.match(prompt, /Target category mix/);
    assert.match(prompt, /Context grounding/);
    assert.ok(prompt.includes(fixture.jobDescription!));
    assert.ok(prompt.includes(fixture.candidateContext!));
    // 70% of 10 → at least 7 grounded questions.
    assert.match(prompt, /at least 7 of the 10 questions/);
  });

  it("computes whole-number mixes that sum to the requested count", () => {
    for (const type of ["General", "Technical", "Behavioral", "Coding", "System Design", "Data / ML", "Product"]) {
      for (const count of [5, 10, 15, 20]) {
        const mix = targetCategoryMix(type, count);
        const total = mix.reduce((sum, [, n]) => sum + n, 0);
        assert.equal(total, count, `${type} @ ${count} summed to ${total}`);
        assert.ok(mix.every(([, n]) => n > 0), `${type} produced a zero-count category`);
      }
    }
  });

  it("weights the mix toward the interview type", () => {
    const top = (type: string) => {
      const mix = targetCategoryMix(type, 20);
      return [...mix].sort((a, b) => b[1] - a[1])[0][0];
    };
    assert.equal(top("Coding"), "coding");
    assert.equal(top("System Design"), "system_design");
    assert.equal(top("Data / ML"), "data_ml");
    assert.equal(top("Behavioral"), "behavioral");
  });
});

describe("golden set: deterministic question quality", () => {
  const provider = new FallbackProvider();

  for (const fixture of GOLDEN_FIXTURES) {
    it(`${fixture.name}: no boilerplate, valid categories, distinct questions`, async () => {
      const questions = await provider.generateQuestions(fixture.ctx);
      assert.equal(questions.length, fixture.ctx.count);

      const seen = new Set<string>();
      for (const q of questions) {
        assert.ok(VALID_CATEGORIES.includes(q.category), `bad category: ${q.category}`);
        assert.ok(["easy", "medium", "hard"].includes(q.difficulty), `bad difficulty: ${q.difficulty}`);
        assert.equal(isBoilerplate(q.question), false, `boilerplate leaked: ${q.question}`);
        assert.equal(seen.has(q.question.toLowerCase()), false, `duplicate question: ${q.question}`);
        seen.add(q.question.toLowerCase());
      }
      assert.ok(
        questions.some((q) => q.category === fixture.expectCategory),
        `expected a ${fixture.expectCategory} question`
      );
    });
  }

  it("keeps Fresher sets easier than 5+ years sets", async () => {
    const fresher = await provider.generateQuestions({ role: "Developer", seniority: "Fresher", count: 10 });
    const senior = await provider.generateQuestions({ role: "Developer", seniority: "5+ years", count: 10 });
    const easy = fresher.filter((q) => q.difficulty === "easy").length;
    const hard = senior.filter((q) => q.difficulty === "hard").length;
    assert.ok(easy > hard, `expected easier Fresher set (easy=${easy}, senior hard=${hard})`);
  });
});

describe("golden set: optional live generation", () => {
  const live = process.env.GOLDEN_LIVE === "1" && Boolean(process.env.OPENROUTER_API_KEY);

  it(
    "generates grounded, boilerplate-free questions against every fixture",
    { skip: live ? false : "set GOLDEN_LIVE=1 and OPENROUTER_API_KEY to run the live golden set" },
    async () => {
      const { OpenRouterProvider } = await import("../src/lib/ai/openrouter");
      const provider = new OpenRouterProvider();

      for (const fixture of GOLDEN_FIXTURES) {
        const questions = await provider.generateQuestions(fixture.ctx);
        assert.ok(questions.length >= Math.max(1, fixture.ctx.count - 2), `${fixture.name}: under-delivered`);

        for (const q of questions) {
          assert.ok(VALID_CATEGORIES.includes(q.category), `${fixture.name}: bad category ${q.category}`);
          assert.equal(isBoilerplate(q.question), false, `${fixture.name}: boilerplate → ${q.question}`);
        }

        if (fixture.ctx.jobDescription || fixture.ctx.candidateContext) {
          const contextTokens = new Set(
            `${fixture.ctx.jobDescription ?? ""} ${fixture.ctx.candidateContext ?? ""}`
              .toLowerCase()
              .match(/[a-z][a-z-]{4,}/g) ?? []
          );
          const grounded = questions.filter((q) =>
            (q.question.toLowerCase().match(/[a-z][a-z-]{4,}/g) ?? []).some((t) => contextTokens.has(t))
          ).length;
          assert.ok(
            grounded / questions.length >= 0.5,
            `${fixture.name}: only ${grounded}/${questions.length} questions referenced the context`
          );
        }
      }
    }
  );
});
