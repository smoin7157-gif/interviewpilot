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
function assertDatabaseUrl(): void {
  const url = process.env.DATABASE_URL;
  if (url && url.trim().length > 0) return;

  // Diagnostics — key NAMES only, never values (secrets stay out of logs).
  const dbLikeKeys = Object.keys(process.env)
    .filter((k) => /(^|_)(DATABASE|DIRECT|PG|POSTGRES|NEON)/i.test(k))
    .sort();
  const details = [
    `DATABASE_URL key present: ${url !== undefined}`,
    `db-related env keys found: ${dbLikeKeys.length > 0 ? dbLikeKeys.join(", ") : "(none)"}`,
    `NODE_ENV: ${process.env.NODE_ENV ?? "(unset)"}`,
    `VERCEL_ENV: ${process.env.VERCEL_ENV ?? "(unset)"}`,
    `running on Vercel: ${process.env.VERCEL ? "yes" : "no"}`,
  ].join(" | ");

  throw new Error(
    `DATABASE_URL is not set in this runtime environment. ${details}. ` +
      `On Vercel, environment variables are baked into each deployment when it is created — ` +
      `after adding/changing them you must create a NEW deployment (push a commit or use ` +
      `\"Redeploy\") for the change to take effect.`
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