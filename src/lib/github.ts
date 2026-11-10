import type { GithubProfileData } from "@/lib/candidate-context";

const GITHUB_USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
const API_ROOT = "https://api.github.com";

/** Extracts the username from a github.com URL or handle. Throws a friendly error when invalid. */
export function parseGithubUsername(input: string): string {
  let url = input.trim();
  if (!url) throw new Error("Enter your GitHub profile URL.");
  if (url.startsWith("@")) url = url.slice(1);
  // Allow bare usernames too, but reject anything that isn't github-shaped.
  const match = url.match(/github\.com\/([^/?#]+)/i) ?? url.match(/^([^/?#]+)$/);
  if (!match) throw new Error("Enter a GitHub profile URL like https://github.com/username");
  const username = match[1].replace(/\/+$/, "");
  if (!GITHUB_USERNAME_RE.test(username)) {
    throw new Error("That doesn't look like a valid GitHub username.");
  }
  return username;
}

/** How many top repos contribute a README excerpt (keeps API calls bounded). */
const README_EXCERPT_TARGETS = 3;

/**
 * Reduce a README's Markdown to the short, human-readable gist used as prompt
 * context: no badges, code blocks, headings, HTML or comments, and no excerpt
 * cut off mid-word. Exported for tests.
 */
export function summarizeReadme(markdown: string, maxChars = 280): string {
  const cleaned = markdown
    .replace(/\r\n/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= maxChars) return cleaned;

  const cut = cleaned.slice(0, maxChars + 1);
  const lastSpace = cut.lastIndexOf(" ");
  const excerpt = lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut.slice(0, maxChars);
  return `${excerpt.trimEnd()}…`;
}

/**
 * Read one public repo's README and summarize it. Deliberately best-effort: a
 * missing, private or rate-limited README yields no excerpt, so attaching a
 * GitHub profile never fails because of it.
 */
async function fetchReadmeExcerpt(
  username: string,
  repo: string,
  headers: Record<string, string>
): Promise<string | null> {
  try {
    const res = await fetch(
      `${API_ROOT}/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}/readme`,
      {
        headers: { ...headers, Accept: "application/vnd.github.raw+json" },
        signal: AbortSignal.timeout(8_000),
      }
    );
    if (!res.ok) return null;
    // Cap what is parsed — some READMEs are hundreds of KB of documentation.
    const excerpt = summarizeReadme((await res.text()).slice(0, 20_000));
    return excerpt.length >= 40 ? excerpt : null;
  } catch {
    return null;
  }
}

interface GithubRepo {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  html_url: string;
  pushed_at: string | null;
  fork: boolean;
}

/**
 * GitHub token for authenticated API requests, when configured.
 *
 * Unauthenticated requests share a 60 req/hr limit **per IP address** — on
 * any hosted platform (where egress IPs are shared across tenants) that
 * budget can be exhausted by other apps, so GitHub-attach would break for
 * everyone at once. A fine-grained PAT with "Public repositories (read-only)"
 * access raises the limit to 6,000 req/hr per account and needs no extra
 * permissions: this code path only ever reads public data.
 */
function githubToken(): string | null {
  const token = process.env.GITHUB_TOKEN?.trim();
  return token ? token : null;
}

/** Public profile analysis — never touches private repositories. */
export async function analyzeGithubProfile(input: string): Promise<GithubProfileData> {
  const username = parseGithubUsername(input);

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "InterviewOS",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = githubToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_ROOT}/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed&type=public`, {
    headers,
    signal: AbortSignal.timeout(15_000),
  });

  if (res.status === 404) {
    throw new Error(`We couldn't find a public GitHub profile for "${username}".`);
  }
  if (res.status === 403) {
    // 403 with the rate-limit header set means the request budget is gone;
    // 403 without it is a private/forbidden resource, which reads the same
    // to the user — either way, continue without GitHub.
    throw new Error(
      "GitHub's request limit was reached. Try again in a few minutes or continue without GitHub."
    );
  }
  if (!res.ok) {
    throw new Error("GitHub is unavailable right now. You can continue without GitHub.");
  }

  const repos = (await res.json()) as GithubRepo[];
  const publicRepos = repos.filter((r) => !r.fork);

  // Language histogram across the candidate's own public repos.
  const byLanguage = new Map<string, number>();
  for (const repo of publicRepos) {
    if (repo.language) byLanguage.set(repo.language, (byLanguage.get(repo.language) ?? 0) + 1);
  }
  const languages = [...byLanguage.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([lang]) => lang);

  const ranked = [...publicRepos].sort(
    (a, b) => b.stargazers_count - a.stargazers_count || (b.pushed_at ?? "").localeCompare(a.pushed_at ?? "")
  );
  const topRepos = ranked.slice(0, 12).map((r) => ({
    name: r.name,
    description: r.description,
    language: r.language,
    stars: r.stargazers_count,
    htmlUrl: r.html_url,
    pushedAt: r.pushed_at,
    readmeExcerpt: null as string | null,
  }));

  // Ground the candidate context in what the top repos actually do, not just
  // their one-line descriptions. Three extra requests per attach keeps the
  // profile inside GitHub's per-IP budget; failures are silently skipped.
  await Promise.all(
    topRepos.slice(0, README_EXCERPT_TARGETS).map(async (repo) => {
      repo.readmeExcerpt = await fetchReadmeExcerpt(username, repo.name, headers);
    })
  );

  return { username, repoCount: publicRepos.length, languages, topRepos };
}
