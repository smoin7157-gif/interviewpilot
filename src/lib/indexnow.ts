import { siteUrl } from "@/lib/env";

/** Host root key file path required by IndexNow (e.g. `/abc123.txt`). */
export function indexNowKeyPath(key = process.env.INDEXNOW_KEY): string | null {
  const trimmed = key?.trim();
  if (!trimmed) return null;
  return `/${trimmed}.txt`;
}

export function isIndexNowKeyRequest(pathname: string, key = process.env.INDEXNOW_KEY): boolean {
  const expected = indexNowKeyPath(key);
  if (!expected) return false;
  return pathname === expected;
}

export function indexNowKeyLocation(): string | null {
  const path = indexNowKeyPath();
  if (!path) return null;
  return `${siteUrl()}${path}`;
}

export type IndexNowPingResult = { ok: boolean; status: number };

/** Notify Bing/Yandex-style IndexNow partners after URL changes (run from CI or an admin script). */
export async function pingIndexNow(urlList: string[]): Promise<IndexNowPingResult> {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key || urlList.length === 0) return { ok: false, status: 0 };

  const base = siteUrl();
  const host = new URL(base).host;
  const keyLocation = `${base}/${key}.txt`;

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key, keyLocation, urlList }),
  });

  return { ok: res.ok, status: res.status };
}