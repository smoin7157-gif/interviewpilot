/**
 * The one database error a request handler is expected to recover from: a
 * unique-constraint violation (Prisma `P2002`).
 *
 * Duck-typed rather than `instanceof Prisma.PrismaClientKnownRequestError` so
 * the check survives a duplicated `@prisma/client` copy (a real failure mode in
 * bundlers and monorepos), and so it can be unit-tested without a database.
 */
export function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  return (error as { code?: unknown }).code === "P2002";
}

/** Prisma cannot reach Postgres (local server off, bad URL, network). */
export function isDatabaseUnreachable(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const e = error as { code?: unknown; name?: unknown; message?: unknown };
  if (e.code === "P1001" || e.code === "P1017") return true;
  if (e.name === "PrismaClientInitializationError") return true;
  const msg = typeof e.message === "string" ? e.message : "";
  return /can't reach database server|connection refused|ECONNREFUSED/i.test(msg);
}

export const DATABASE_UNAVAILABLE_MESSAGE =
  "We can't reach the database right now. If you're running locally, start Postgres (e.g. npx prisma dev -d) and confirm DATABASE_URL in .env.";
