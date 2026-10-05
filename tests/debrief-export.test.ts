import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildDebriefMarkdown,
  debriefExportFileName,
  DEBRIEF_EXPORT_DISCLAIMER,
} from "../src/lib/debrief-export";
import type { DebriefData } from "../src/lib/types";

const debrief: DebriefData = {
  overallScore: 78,
  breakdown: [
    { dimension: "technical", score: 75, note: "Solid depth on the API design.", evidence: "You described idempotent retries." },
    { dimension: "communication", score: 82 },
    { dimension: "structure", score: 70 },
    { dimension: "relevance", score: 80 },
    { dimension: "project_knowledge", score: 74 },
    { dimension: "problem_solving", score: 78 },
  ],
  strengths: ["Clear trade-off reasoning"],
  weaknesses: ["Rambles on the intro"],
  missedOpportunities: ["Could have quantified the latency win"],
  strongestAnswer: { question: "How did you cache the feed?", why: "Concrete and measured." },
  weakestAnswer: { question: "Tell me about a conflict.", why: "Stayed generic." },
  recommendedPractice: ["Practice a 30-second STAR opener"],
  provider: "openrouter",
  model: "openai/gpt-4o-mini",
};

const meta = {
  role: "Backend Engineer",
  seniority: "3–5 years",
  company: "Acme",
  interviewType: "Technical",
  createdAt: new Date("2026-10-05T12:00:00.000Z"),
};

describe("buildDebriefMarkdown", () => {
  it("renders the header, facts and score", () => {
    const md = buildDebriefMarkdown({ meta, debrief });
    assert.match(md, /^# Mock Interview Debrief — Backend Engineer/m);
    assert.match(md, /\*\*Company:\*\* Acme/);
    assert.match(md, /\*\*Experience level:\*\* 3–5 years/);
    assert.match(md, /\*\*Interview type:\*\* Technical/);
    assert.match(md, /\*\*Date:\*\* 2026-10-05/);
    assert.match(md, /\*\*Overall score:\*\* 78\/100/);
  });

  it("labels every dimension and keeps notes and evidence", () => {
    const md = buildDebriefMarkdown({ meta, debrief });
    assert.match(md, /\*\*Technical — 75\/100\*\*: Solid depth on the API design\./);
    assert.match(md, /- Evidence: You described idempotent retries\./);
    assert.match(md, /\*\*Project knowledge — 74\/100\*\*/);
    assert.match(md, /\*\*Problem solving — 78\/100\*\*/);
  });

  it("includes the feedback sections and the strongest/weakest answers", () => {
    const md = buildDebriefMarkdown({ meta, debrief });
    assert.match(md, /## What you did well\n\n- Clear trade-off reasoning/);
    assert.match(md, /## What to work on\n\n- Rambles on the intro/);
    assert.match(md, /## Missed opportunities\n\n- Could have quantified the latency win/);
    assert.match(md, /## Strongest answer\n\n> How did you cache the feed\?\n\nConcrete and measured\./);
    assert.match(md, /## Weakest answer\n\n> Tell me about a conflict\.\n\nStayed generic\./);
    assert.match(md, /## Recommended practice\n\n- Practice a 30-second STAR opener/);
  });

  it("appends the practice-feedback disclaimer", () => {
    const md = buildDebriefMarkdown({ meta, debrief });
    assert.ok(md.includes(DEBRIEF_EXPORT_DISCLAIMER));
  });

  it("exports the transcript with speaker labels", () => {
    const md = buildDebriefMarkdown({
      meta,
      debrief,
      turns: [
        { speaker: "AI", text: "Tell me about your caching work." },
        { speaker: "CANDIDATE", text: "We added a read-through cache\nwith a 5-minute TTL." },
      ],
    });
    assert.match(md, /## Transcript/);
    assert.match(md, /\*\*Interviewer:\*\* Tell me about your caching work\./);
    // Multi-line turns collapse to one Markdown line.
    assert.match(md, /\*\*You:\*\* We added a read-through cache with a 5-minute TTL\./);
  });

  it("works with a transcript only, when no debrief exists yet", () => {
    const md = buildDebriefMarkdown({
      meta,
      debrief: null,
      turns: [{ speaker: "AI", text: "Walk me through your background." }],
    });
    assert.doesNotMatch(md, /## Score breakdown/);
    assert.doesNotMatch(md, /Overall score/);
    assert.match(md, /## Transcript/);
  });

  it("still produces a valid document with neither debrief nor turns", () => {
    const md = buildDebriefMarkdown({ meta });
    assert.match(md, /^# Mock Interview Debrief — Backend Engineer/);
    assert.doesNotMatch(md, /## Transcript/);
    assert.ok(md.includes(DEBRIEF_EXPORT_DISCLAIMER));
  });

  it("falls back to a title-cased label for an unknown dimension", () => {
    const md = buildDebriefMarkdown({
      meta,
      debrief: { ...debrief, breakdown: [{ dimension: "team_fit", score: 60 }] },
    });
    assert.match(md, /\*\*Team Fit — 60\/100\*\*/);
  });
});

describe("debriefExportFileName", () => {
  it("slugs the role and appends the session date", () => {
    assert.equal(debriefExportFileName(meta), "mock-debrief-backend-engineer-2026-10-05.md");
  });

  it("strips unsafe characters and falls back when the role is empty", () => {
    assert.equal(
      debriefExportFileName({ role: "C++ / Systems Engineer" }),
      "mock-debrief-c-systems-engineer.md"
    );
    assert.equal(debriefExportFileName({ role: "!!!" }), "mock-debrief-mock-interview.md");
  });
});
