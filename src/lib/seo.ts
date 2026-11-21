import type { Metadata } from "next";

/** Private app surfaces — keep in sync with `src/app/robots.ts`. */
export const PRIVATE_ROUTE_PREFIXES = [
  "/api",
  "/dashboard",
  "/interviews",
  "/history",
  "/settings",
  "/mock",
] as const;

/**
 * Production marketing pages should be indexed; Vercel preview/development
 * deployments should not leak into search results.
 */
export function isSearchIndexingEnabled(): boolean {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv && vercelEnv !== "production") return false;
  return true;
}

export const PUBLIC_ROBOTS: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: { index: true, follow: true },
};

export const PRIVATE_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false, noimageindex: true },
};

/** Search-engine and AI crawler user agents allowed to read public pages. */
export const AI_SEARCH_USER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "PerplexityBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
] as const;

export function siteVerificationMetadata(): Pick<Metadata, "verification"> {
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const bing = process.env.BING_SITE_VERIFICATION?.trim();
  if (!google && !bing) return {};
  return {
    verification: {
      ...(google ? { google } : {}),
      ...(bing ? { other: { "msvalidate.01": bing } } : {}),
    },
  };
}