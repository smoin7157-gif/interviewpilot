/**
 * Candidate context (InterviewOS Phase 2).
 *
 * Everything here is a plain, serializable shape. Only facts actually present
 * in the source (form, resume, GitHub, manual projects) may end up in these
 * objects — never inferred or invented. JSON columns in the DB store exactly
 * these shapes.
 */

export interface ResumeData {
  skills: string[];
  experience: string[];
  education: string[];
  projects: string[];
  achievements: string[];
  certifications: string[];
  technologies: string[];
}

export const EMPTY_RESUME: ResumeData = {
  skills: [],
  experience: [],
  education: [],
  projects: [],
  achievements: [],
  certifications: [],
  technologies: [],
};

export interface GithubRepoSummary {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  htmlUrl: string;
  pushedAt: string | null;
}

export interface GithubProfileData {
  username: string;
  repoCount: number;
  /** Top primary languages across public repos, most common first. */
  languages: string[];
  /** Highest-starred public repos (or most recently pushed when none have stars). */
  topRepos: GithubRepoSummary[];
}

export interface CandidateProjectData {
  name: string;
  repositoryUrl: string | null;
  description: string | null;
  techStack: string | null;
  contribution: string | null;
}

/**
 * Builds a short, normalized summary of everything known about the candidate's
 * target job + background, for use in AI prompts. Kept deliberately compact
 * for cost control — raw resume text is never sent wholesale to the model.
 */
export function buildCandidateContextSummary(ctx: {
  role: string;
  seniority: string;
  company?: string | null;
  companyType?: string | null;
  interviewType?: string | null;
  jobDescription?: string | null;
  resumeContext?: ResumeData | null;
  githubContext?: GithubProfileData | null;
  projects?: CandidateProjectData[] | null;
}): string {
  const lines: string[] = [];

  if (ctx.companyType) lines.push(`- Company type: ${ctx.companyType}`);
  if (ctx.company) lines.push(`- Target company: ${ctx.company}`);
  if (ctx.interviewType) lines.push(`- Interview type: ${ctx.interviewType}`);

  const resume = ctx.resumeContext;
  const resumeBullets: string[] = [];
  if (resume) {
    if (resume.skills.length > 0) resumeBullets.push(`Skills: ${resume.skills.slice(0, 25).join(", ")}`);
    if (resume.technologies.length > 0)
      resumeBullets.push(`Technologies: ${resume.technologies.slice(0, 25).join(", ")}`);
    if (resume.experience.length > 0)
      resumeBullets.push(`Experience: ${resume.experience.slice(0, 8).join(" | ")}`);
    if (resume.projects.length > 0) resumeBullets.push(`Resume projects: ${resume.projects.slice(0, 6).join(" | ")}`);
    if (resume.education.length > 0) resumeBullets.push(`Education: ${resume.education.slice(0, 4).join(" | ")}`);
    if (resume.achievements.length > 0)
      resumeBullets.push(`Achievements: ${resume.achievements.slice(0, 4).join(" | ")}`);
    if (resume.certifications.length > 0)
      resumeBullets.push(`Certifications: ${resume.certifications.slice(0, 4).join(" | ")}`);
  }
  if (resumeBullets.length > 0) lines.push(`- Resume (facts present only):\n${resumeBullets.map((b) => `  ${b}`).join("\n")}`);

  if (ctx.githubContext) {
    const g = ctx.githubContext;
    const top = g.topRepos
      .slice(0, 8)
      .map((r) => `${r.name}${r.language ? ` (${r.language})` : ""}${r.stars > 0 ? ` ⭐${r.stars}` : ""}`)
      .join(", ");
    lines.push(
      `- GitHub (@${g.username}): ${g.repoCount} public repos` +
        (g.languages.length > 0 ? `; top languages: ${g.languages.slice(0, 8).join(", ")}` : "") +
        (top ? `; notable repos: ${top}` : "")
    );
  }

  if (ctx.projects && ctx.projects.length > 0) {
    const projects = ctx.projects
      .map((p) => {
        const bits = [`${p.name}`];
        if (p.techStack) bits.push(`stack: ${p.techStack}`);
        if (p.description) bits.push(`description: ${p.description}`);
        if (p.contribution) bits.push(`contribution: ${p.contribution}`);
        if (p.repositoryUrl) bits.push(`repo: ${p.repositoryUrl}`);
        return `- ${bits.join(" · ")}`;
      })
      .join("\n");
    lines.push(`- Candidate projects:\n${projects}`);
  }

  return lines.join("\n");
}
