import type { MetadataRoute } from "next";

const baseUrl = process.env.APP_URL ?? "http://localhost:3000";

/** Public, crawlable routes only (everything else sits behind auth). */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${baseUrl}/`, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${baseUrl}/signup`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/login`, lastModified, changeFrequency: "yearly", priority: 0.5 },
  ];
}
