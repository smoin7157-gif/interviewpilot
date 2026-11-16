import { createHash } from "node:crypto";

const MAX_ENTRIES = 128;
const TTL_MS = 10 * 60 * 1000;

type CacheEntry<T> = { value: T; expiresAt: number };

const store = new Map<string, CacheEntry<unknown>>();

/** Collapse whitespace so incidental spacing does not bust cache keys. */
export function normalizeStableText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function stableInputHash(namespace: string, payload: unknown): string {
  const body = JSON.stringify(payload);
  return createHash("sha256").update(namespace).update("\0").update(body).digest("hex");
}

/** Derive an OpenAI-compatible seed from a stable hash (scoring / extraction). */
export function seedFromStableHash(hashHex: string): number {
  return Number.parseInt(hashHex.slice(0, 8), 16) & 0x7fffffff;
}

export function getStableCached<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function setStableCached<T>(key: string, value: T): void {
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

/** @internal tests only */
export function clearStableInputCache(): void {
  store.clear();
}