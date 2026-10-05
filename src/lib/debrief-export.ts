import type { DebriefData } from "@/lib/types";

/**
 * Debrief export (InterviewOS Phase 4 polish).
 *
 * Serializes a stored debrief — plus the transcript it was derived from — into
 * portable Markdown so a candidate can keep, share, or paste their practice
 * feedback outside the app. Deliberately pure and dependency-free: the same
 * function runs on the server and in the browser, and is unit-tested directly.
 */

/** Human labels for the six debrief dimensions, shared with the debrief UI. */
export const DIMENSION_LABELS: Record<string, string> = {
  technical: "Technical",
  communication: "Communication",
  structure: "Structure",
  relevance: "Relevance",
  project_knowledge: "Project knowledge",
  problem_solving: "Problem solving",
};

export interface DebriefExportMeta {
  role: string;
  seniority?: string | null;
  company?: string | null;
  interviewType?: string | null;
  /** When the mock session was created — rendered as an ISO date. */
  createdAt?: Date | string | null;
}

export interface DebriefExportTurn {
  speaker: string;
  text: string;
}

/** Shown verbatim at the foot of every export. */
export const DEBRIEF_EXPORT_DISCLAIMER =
  "Session-level practice feedback derived from your spoken answers — not an employability score.";

function titleCase(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  return value.trim() || null;
}

/**
 * Collapse embedded newlines and runs of whitespace so every exported item
 * stays a single Markdown line (a transcript turn can span several lines).
 */
function cleanLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function bulletSection(title: string, items: string[]): string[] {
  const clean = items.map(cleanLine).filter(Boolean);
  if (clean.length === 0) return [];
  return [`## ${title}`, "", ...clean.map((item) => `- ${item}`), ""];
}

function answerSection(title: string, answer: { question: string; why: string }): string[] {
  const question = cleanLine(answer.question ?? "");
  const why = cleanLine(answer.why ?? "");
  if (!question && !why) return [];
  const lines = [`## ${title}`, ""];
  if (question) lines.push(`> ${question}`, "");
  if (why) lines.push(why, "");
  return lines;
}

/**
 * Build a self-contained Markdown document for one mock session. Works with a
 * debrief, a transcript, or both — a session whose debrief hasn't been
 * generated yet still exports its transcript.
 */
export function buildDebriefMarkdown(input: {
  meta: DebriefExportMeta;
  debrief?: DebriefData | null;
  turns?: DebriefExportTurn[];
}): string {
  const { meta, debrief, turns = [] } = input;
  const lines: string[] = [`# Mock Interview Debrief — ${meta.role}`.trim(), ""];

  const facts: string[] = [];
  if (meta.company) facts.push(`**Company:** ${meta.company}`);
  if (meta.seniority) facts.push(`**Experience level:** ${meta.seniority}`);
  if (meta.interviewType) facts.push(`**Interview type:** ${meta.interviewType}`);
  const date = formatDate(meta.createdAt);
  if (date) facts.push(`**Date:** ${date}`);
  if (debrief) facts.push(`**Overall score:** ${debrief.overallScore}/100`);
  if (facts.length > 0) lines.push(...facts.map((fact) => `- ${fact}`), "");

  if (debrief) {
    lines.push("## Score breakdown", "");
    for (const dimension of debrief.breakdown) {
      const label = DIMENSION_LABELS[dimension.dimension] ?? titleCase(dimension.dimension);
      const note = dimension.note ? `: ${cleanLine(dimension.note)}` : "";
      lines.push(`- **${label} — ${dimension.score}/100**${note}`);
      if (dimension.evidence) lines.push(`  - Evidence: ${cleanLine(dimension.evidence)}`);
    }
    lines.push("");

    lines.push(...bulletSection("What you did well", debrief.strengths));
    lines.push(...bulletSection("What to work on", debrief.weaknesses));
    lines.push(...bulletSection("Missed opportunities", debrief.missedOpportunities));
    lines.push(...answerSection("Strongest answer", debrief.strongestAnswer));
    lines.push(...answerSection("Weakest answer", debrief.weakestAnswer));
    lines.push(...bulletSection("Recommended practice", debrief.recommendedPractice));

    if (debrief.provider === "fallback") {
      lines.push("_Generated offline from answer heuristics (no AI key configured)._", "");
    }
  }

  const transcript = turns.filter((turn) => turn.text?.trim());
  if (transcript.length > 0) {
    lines.push("## Transcript", "");
    for (const turn of transcript) {
      const speaker = turn.speaker === "AI" ? "Interviewer" : "You";
      lines.push(`**${speaker}:** ${cleanLine(turn.text)}`, "");
    }
  }

  lines.push("---", "", `_${DEBRIEF_EXPORT_DISCLAIMER}_`, "");

  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}

/** A filesystem-safe `.md` filename for the export (role + session date). */
export function debriefExportFileName(meta: DebriefExportMeta): string {
  const slug =
    meta.role
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "mock-interview";
  const date = formatDate(meta.createdAt);
  return `mock-debrief-${slug}${date ? `-${date}` : ""}.md`;
}
