import { PrismaClient } from "@prisma/client";

// Prisma resolves the datasource from process.env.DATABASE_URL at runtime.
// Fail fast with a clear message when it's missing (e.g. a Vercel deployment
// that predates the environment variable) instead of Prisma's cryptic
// "You must provide `url`…" error on the first query.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || databaseUrl.trim().length === 0) {
  throw new Error(
    "DATABASE_URL is not set in this runtime environment. Add it in Vercel → Settings → " +
      "Environment Variables (Production + Preview), then redeploy."
  );
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
