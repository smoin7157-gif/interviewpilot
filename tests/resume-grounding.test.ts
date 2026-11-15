import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { claimSupportedInSource, clampResumeToSource } from "../src/lib/ai/resume-grounding";

const SOURCE = `Jane Doe
Skills: TypeScript, Node.js
Experience: Built APIs at Acme Corp (2020–2023)
Education: B.S. Computer Science, State University`;

describe("resume grounding", () => {
  it("drops skills that never appear in the source document", () => {
    const clamped = clampResumeToSource(SOURCE, {
      skills: ["TypeScript", "Kubernetes", "Rust"],
      technologies: [],
      experience: [],
      education: [],
      projects: [],
      achievements: [],
      certifications: [],
    });
    assert.deepEqual(clamped.skills, ["TypeScript"]);
  });

  it("keeps experience lines grounded in the pasted resume", () => {
    const clamped = clampResumeToSource(SOURCE, {
      skills: [],
      technologies: [],
      experience: ["Built APIs at Acme Corp", "Staff engineer at FAANG since 2019"],
      education: [],
      projects: [],
      achievements: [],
      certifications: [],
    });
    assert.deepEqual(clamped.experience, ["Built APIs at Acme Corp"]);
  });

  it("accepts claims whose tokens mostly appear in the source", () => {
    assert.equal(claimSupportedInSource("TypeScript and Node.js", SOURCE), true);
    assert.equal(claimSupportedInSource("Quantum computing lead", SOURCE), false);
  });
});