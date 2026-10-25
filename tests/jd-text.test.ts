import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractJdFacts,
  extractJdResponsibilities,
  extractJdSkills,
} from "../src/lib/ai/jd-text";
import { listKnownSkills } from "../src/lib/jd";

/**
 * Guards for reading a candidate's own pasted job description.
 *
 * The deterministic provider grounds questions in whatever this module reads,
 * so the risks worth pinning are: missing a technology the posting names,
 * inventing one it does not, and reading ordinary English as a stack.
 */

const BACKEND_JD = `Backend Engineer (Node.js)
We're looking for a backend engineer to build APIs with Node, Postgres and TypeScript.
Own reliability and on-call for the services you ship.
Nice to have: experience with Kafka and Docker.
The rest of the team works from anywhere. We go to market fast.`;

describe("extractJdSkills", () => {
  it("reads the posting's real technologies, in mention order, display-cased", () => {
    assert.deepEqual(extractJdSkills(BACKEND_JD), [
      "Node.js",
      "PostgreSQL",
      "TypeScript",
      "Kafka",
      "Docker",
    ]);
  });

  it("does not turn ordinary English into a technology", () => {
    const skills = extractJdSkills(BACKEND_JD);
    assert.equal(skills.includes("REST"), false, '"the rest of the team" is not REST');
    assert.equal(skills.includes("Go"), false, '"we go to market" is not Go');
  });

  it("does not read the js in Node.js or Next.js as a JavaScript requirement", () => {
    const skills = extractJdSkills("We build with Node.js and Next.js.");
    assert.ok(skills.includes("Node.js"));
    assert.ok(skills.includes("Next.js"));
    assert.equal(skills.includes("JavaScript"), false);
  });

  it("matches spelling variants to the canonical label", () => {
    const skills = extractJdSkills("You will use nodejs, postgres, k8s and golang daily.");
    assert.deepEqual(skills, ["Node.js", "PostgreSQL", "Kubernetes", "Go"]);
  });

  it("recognises common technologies the seed dataset does not name", () => {
    const skills = extractJdSkills("Our stack: Django, Vue and MongoDB.");
    assert.deepEqual(skills, ["Django", "Vue", "MongoDB"]);
  });

  it("keeps people/process skills out of the hands-on technology list", () => {
    const skills = extractJdSkills("Requires roadmap planning and stakeholder management.");
    assert.deepEqual(skills, []);
  });

  it("returns nothing for an empty or unrecognisable posting", () => {
    assert.deepEqual(extractJdSkills(undefined), []);
    assert.deepEqual(extractJdSkills("   "), []);
    assert.deepEqual(extractJdSkills("We offer competitive pay and a friendly team."), []);
  });

  it("uses a vocabulary that is in sync with the seed dataset", () => {
    const known = new Set(listKnownSkills().map((skill) => skill.toLowerCase()));
    assert.ok(known.size > 100, `expected a broad vocabulary, got ${known.size}`);
    for (const label of ["postgresql", "typescript", "kubernetes"]) {
      assert.equal(known.has(label), true, `seed vocabulary is missing ${label}`);
    }
  });
});

describe("extractJdResponsibilities", () => {
  it("keeps duty-shaped lines and drops headings, boilerplate and perks", () => {
    const duties = extractJdResponsibilities(BACKEND_JD);
    assert.deepEqual(duties, [
      "build APIs with Node, Postgres and TypeScript",
      "Own reliability and on-call for the services you ship",
    ]);
  });

  it("splits a prose posting into its individual duties", () => {
    const duties = extractJdResponsibilities(
      "In this role you will build the payment service. You'll own its on-call rotation."
    );
    assert.deepEqual(duties, [
      "build the payment service",
      "own its on-call rotation",
    ]);
  });

  it("ignores headings and benefit copy", () => {
    assert.deepEqual(extractJdResponsibilities("Requirements:\nWe offer great benefits."), []);
  });
});

describe("extractJdFacts", () => {
  it("reports the posting's shape so design and data questions stay appropriate", () => {
    assert.equal(extractJdFacts("Design a reliable, distributed service at scale.").designs, true);
    assert.equal(extractJdFacts("Own the machine learning pipeline and model evaluation.").data, true);
    assert.equal(extractJdFacts("Build CRUD screens for the internal admin tool.").designs, false);
  });

  it("returns empty facts when no posting was pasted", () => {
    assert.deepEqual(extractJdFacts(undefined), {
      skills: [],
      responsibilities: [],
      designs: false,
      data: false,
    });
  });
});
