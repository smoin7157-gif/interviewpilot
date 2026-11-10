import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { summarizeReadme } from "../src/lib/github";

/**
 * README excerpts are prompt input, so they must be short, plain prose: badges,
 * code blocks, headings and HTML would otherwise spend the model's attention on
 * formatting instead of what the candidate actually built.
 */
describe("summarizeReadme", () => {
  it("strips badges, headings, links and code fences", () => {
    const readme = [
      "# HireAI",
      "",
      "[![Build](https://img.shields.io/badge)](https://ci.example.com)",
      "",
      "A resume-to-interview coach built on **Next.js** and `Postgres`.",
      "",
      "## Getting started",
      "",
      "```bash",
      "npm run dev",
      "```",
      "",
      "Read the [docs](https://example.com/docs).",
    ].join("\n");

    const summary = summarizeReadme(readme);
    assert.match(summary, /HireAI/);
    assert.match(summary, /Next\.js/);
    assert.match(summary, /Postgres/);
    assert.match(summary, /Read the docs/);
    assert.ok(!summary.includes("npm run dev"), "code blocks are not prompt material");
    assert.ok(!summary.includes("img.shields.io"), "badges are noise");
    assert.ok(!summary.startsWith("#"), "heading markers are stripped");
  });

  it("caps long READMEs at a word boundary with an ellipsis", () => {
    const summary = summarizeReadme("word ".repeat(200).trim(), 60);
    assert.ok(summary.length <= 61, `expected <= 61 chars, got ${summary.length}`);
    assert.ok(summary.endsWith("…"));
    assert.ok(!/\bwor…$/.test(summary), "must not cut a word in half");
  });

  it("returns an empty string when there is nothing readable", () => {
    assert.equal(summarizeReadme(""), "");
    assert.equal(summarizeReadme("<!-- nothing here -->"), "");
    assert.equal(summarizeReadme("## Only a heading"), "Only a heading");
  });
});
