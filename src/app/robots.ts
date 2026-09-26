import type { MetadataRoute } from "next";

const baseUrl = process.env.APP_URL ?? "http://localhost:3000";

/**
 * Only the public marketing/auth surfaces are crawlable — everything behind
 * the session cookie is user-scoped and must never be indexed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/interviews", "/history", "/settings", "/mock", "/api"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
