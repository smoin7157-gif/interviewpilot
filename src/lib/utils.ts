export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Validates a `?next=` redirect target so login/signup can return users to
 * where they were headed. Only same-app absolute paths are honored —
 * protocol-relative (//evil.com), encoded, and foreign URLs fall back to
 * /dashboard so the parameter can never be used for open redirects.
 */
export function safeRedirectPath(raw: unknown): string {
  if (typeof raw !== "string") return "/dashboard";
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return "/dashboard";
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.startsWith("/\\")) {
    return "/dashboard";
  }
  // One level of decoding can hide a second; reject anything protocol-ish.
  if (/:/.test(decoded)) return "/dashboard";
  return decoded;
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

const CATEGORY_LABELS: Record<string, string> = {
  technical: "Technical",
  behavioral: "Behavioral",
  project: "Project",
  job_description: "Job description",
  coding: "Coding",
  system_design: "System design",
  data_ml: "Data / ML",
  company: "Company",
  general: "General",
  "role-specific": "Role-specific",
};

/** Renders InterviewOS category keys (and legacy capitalized values) as friendly labels. */
export function formatQuestionCategory(category: string): string {
  const lower = category.trim().toLowerCase();
  if (CATEGORY_LABELS[lower]) return CATEGORY_LABELS[lower];
  if (CATEGORY_LABELS[category]) return CATEGORY_LABELS[category];
  return category;
}

/** Normalizes easy/medium/hard (or legacy Easy/Medium/Hard) for display. */
export function formatQuestionDifficulty(difficulty: string): string {
  const lower = difficulty.trim().toLowerCase();
  if (lower === "easy" || lower === "medium" || lower === "hard") {
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  return difficulty;
}
