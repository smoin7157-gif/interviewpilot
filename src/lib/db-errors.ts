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
