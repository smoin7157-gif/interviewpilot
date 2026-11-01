import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

const baseUrl = siteUrl();

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
