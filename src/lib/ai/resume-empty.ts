import type { ResumeData } from "@/lib/candidate-context";

export function isResumeDataEmpty(data: ResumeData): boolean {
  return (
    data.skills.length === 0 &&
    data.technologies.length === 0 &&
    data.experience.length === 0 &&
    data.education.length === 0 &&
    data.projects.length === 0 &&
    data.achievements.length === 0 &&
    data.certifications.length === 0
  );
}