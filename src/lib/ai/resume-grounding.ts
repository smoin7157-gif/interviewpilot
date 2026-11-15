import type { ResumeData } from "@/lib/candidate-context";

function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Whether a structured resume fact is grounded in the original document text.
 * Used after AI extraction so invented employers, skills, or credentials never
 * enter question generation as facts.
 */
export function claimSupportedInSource(claim: string, sourceText: string): boolean {
  const claimN = normalizeForMatch(claim);
  const sourceN = normalizeForMatch(sourceText);
  if (claimN.length < 2) return false;
  if (sourceN.includes(claimN)) return true;

  const STOP = new Set(["and", "the", "for", "with", "from", "that", "this", "your", "our"]);
  const tokens = claimN.split(/[^a-z0-9+#/.]+/).filter((t) => t.length >= 3 && !STOP.has(t));
  if (tokens.length === 0) return sourceN.includes(claimN);
  const hits = tokens.filter((t) => sourceN.includes(t));
  return hits.length / tokens.length >= 0.7;
}

export function clampResumeToSource(sourceText: string, data: ResumeData): ResumeData {
  const keep = (items: string[]) => items.filter((item) => claimSupportedInSource(item, sourceText));
  return {
    skills: keep(data.skills),
    technologies: keep(data.technologies),
    experience: keep(data.experience),
    education: keep(data.education),
    projects: keep(data.projects),
    achievements: keep(data.achievements),
    certifications: keep(data.certifications),
  };
}