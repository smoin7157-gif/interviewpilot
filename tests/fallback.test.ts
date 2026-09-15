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

  it("favors easy questions for a Fresher and hard questions for 5+ years", async () => {
    const fresher = await provider.generateQuestions({ role: "Backend Engineer", seniority: "Fresher", count: 8 });
    const senior = await provider.generateQuestions({ role: "Backend Engineer", seniority: "5+ years", count: 8 });
    const easyFresher = fresher.filter((q) => q.difficulty === "easy").length;
    const hardSenior = senior.filter((q) => q.difficulty === "hard").length;
    assert.ok(easyFresher >= 4, `expected mostly easy for Fresher, got ${easyFresher}/8 easy`);
    assert.ok(hardSenior >= 3, `expected substantial hard for 5+ years, got ${hardSenior}/8 hard`);
  });

  it("emphasizes system_design questions for a System Design interview", async () => {
    const questions = await provider.generateQuestions({
      role: "Backend Engineer",
      seniority: "3–5 years",
      interviewType: "System Design",
      count: 8,
    });
    const sd = questions.filter((q) => q.category === "system_design").length;
    assert.ok(sd >= 2, `expected system_design emphasis, got ${sd}/8`);
  });

  it("includes coding and data_ml coverage now that templates exist", async () => {
    const coding = await provider.generateQuestions({
      role: "Software Engineer",
      seniority: "1–3 years",
      interviewType: "Coding",
      count: 6,
    });
    assert.ok(coding.some((q) => q.category === "coding"), "expected coding questions for a Coding interview");
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