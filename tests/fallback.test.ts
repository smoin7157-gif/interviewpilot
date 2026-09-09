import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FallbackProvider } from "../src/lib/ai/fallback";

const provider = new FallbackProvider();

describe("FallbackProvider.generateQuestions", () => {
  it("returns exactly the requested number of questions", async () => {
    const questions = await provider.generateQuestions({
      role: "Frontend Engineer",
      seniority: "Mid",
      company: "Acme",
      count: 5,
    });
    assert.equal(questions.length, 5);
    const categories = [
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
    for (const q of questions) {
      assert.ok(q.question.length > 0);
      assert.ok(categories.includes(q.category));
      assert.ok(["easy", "medium", "hard"].includes(q.difficulty));
    }
  });

  it("caps at the available bank size", async () => {
    const questions = await provider.generateQuestions({
      role: "Frontend Engineer",
      seniority: "Mid",
      count: 10_000,
    });
    assert.ok(questions.length <= 100);
  });
});

describe("FallbackProvider.extractResume", () => {
  it("extracts skills from a SKILLS section and technologies from keywords", async () => {
    const data = await provider.extractResume(
      ["SKILLS", "TypeScript, React, Node.js, SQL", "EXPERIENCE", "Built a payment service at Acme."].join("\n")
    );
    assert.ok(data.skills.length >= 3);
    assert.ok(data.skills.some((s) => s.toLowerCase().includes("typescript")));
    assert.ok(data.technologies.some((t) => t.toLowerCase().includes("react")));
    assert.ok(data.experience.some((e) => e.toLowerCase().includes("payment")));
  });
});

describe("FallbackProvider.generateFollowUps", () => {
  it("returns up to 3 follow-ups", async () => {
    const followUps = await provider.generateFollowUps({
      question: "Tell me about a hard problem you solved.",
      role: "Backend Engineer",
      seniority: "3–5 years",
    });
    assert.ok(followUps.length >= 1 && followUps.length <= 3);
  });
});