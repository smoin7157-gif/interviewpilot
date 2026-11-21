import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import {
  AI_SEARCH_USER_AGENTS,
  isSearchIndexingEnabled,
  PRIVATE_ROUTE_PREFIXES,
} from "@/lib/seo";

const baseUrl = siteUrl();
const disallow = [...PRIVATE_ROUTE_PREFIXES];

export default function robots(): MetadataRoute.Robots {
  if (!isSearchIndexingEnabled()) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  const rules: MetadataRoute.Robots["rules"] = [
    {
      userAgent: "*",
      allow: "/",
      disallow,
    },
    ...AI_SEARCH_USER_AGENTS.map((userAgent) => ({
      userAgent,
      allow: "/",
      disallow,
    })),
  ];

  return {
    rules,
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}