import { PrismaClient } from "@prisma/client";

// Prisma resolves the datasource from process.env.DATABASE_URL at runtime
// (schema.prisma: url = env("DATABASE_URL")) — it never needs the URL at
// module load, so constructing the client eagerly is safe during `next build`.
//
// The fail-fast check is deliberately LAZY (first property access = first real
// query): if it ran at module scope it would throw during Next.js page-data
// collection on Vercel, where build-time modules don't have DATABASE_URL set.
// At runtime, a missing variable surfaces as a clear message on the first query
// instead of Prisma's cryptic "You must provide `url`…" error.
//
// Diagnostics describe the value's SHAPE only — length, whether it starts with
// the postgres protocol, whether the key exists. The value itself is never
// logged, so secrets stay out of logs.
type UrlShape =
  | { kind: "missing"; length: number }
  | { kind: "empty"; length: number }
  | { kind: "whitespace"; length: number }
  | { kind: "bad-protocol"; length: number }
  | { kind: "ok"; length: number };

function describeDatabaseUrl(raw: string | undefined): UrlShape {
  if (raw === undefined) return { kind: "missing", length: 0 };
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { kind: raw.length === 0 ? "empty" : "whitespace", length: raw.length };
  }
  if (!/^postgres(ql)?:\/\//i.test(trimmed)) {
    return { kind: "bad-protocol", length: trimmed.length };
  }
  return { kind: "ok", length: trimmed.length };
}

function runtimeContext(): string {
  const dbLikeKeys = Object.keys(process.env)
    .filter((k) => /(^|_)(DATABASE|DIRECT|PG|POSTGRES|NEON)/i.test(k))
    .sort();
  return [
    `db-related env keys: ${dbLikeKeys.length > 0 ? dbLikeKeys.join(", ") : "(none)"}`,
    `NODE_ENV: ${process.env.NODE_ENV ?? "(unset)"}`,
    `VERCEL_ENV: ${process.env.VERCEL_ENV ?? "(unset)"}`,
    `running on Vercel: ${process.env.VERCEL ? "yes" : "no"}`,
  ].join(" | ");
}

function assertDatabaseUrl(): void {
  const shape = describeDatabaseUrl(process.env.DATABASE_URL);
  if (shape.kind === "ok") return;

  const reason: Record<Exclude<UrlShape["kind"], "ok">, string> = {
    missing: "is NOT SET (key absent) in this runtime environment",
    empty: "is SET but its value is an EMPTY string",
    whitespace: `is SET but its value is whitespace-only (${shape.length} chars)`,
    "bad-protocol": `is SET (${shape.length} chars) but does not start with postgresql:// or postgres://`,
  };

  throw new Error(
    `DATABASE_URL ${reason[shape.kind]}. ` +
      `${runtimeContext()}. ` +
      `If you are on Vercel: check the VALUE (not just the variable name) under Settings → ` +
      `Environment Variables — it must be the full postgresql:// connection string. Values are ` +
      `baked into each deployment when it is created, so after fixing it you MUST create a NEW ` +
      `deployment (push a commit or click \"Redeploy\").`
  );
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  assertDatabaseUrl();
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

// Lazy proxy: validates DATABASE_URL only when a query actually runs. All
// usage sites (`prisma.model.method(...)`) work unchanged.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = globalForPrisma.prisma ?? createPrismaClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});