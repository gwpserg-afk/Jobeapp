import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// SQLite-only tuning PRAGMAs. Postgres rejects "PRAGMA" (syntax error 42601),
// so only run these when the database is actually SQLite (local dev).
async function initSqlitePragmas(prisma: PrismaClient) {
  const url = process.env.DATABASE_URL ?? "";
  const isSqlite = url.startsWith("file:") || url.includes(".db") || url.trim() === "";
  if (!isSqlite) return;
  try {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
    await prisma.$queryRawUnsafe("PRAGMA foreign_keys = ON;");
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 10000;");
    await prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL;");
  } catch {
    // Non-fatal: pragmas are an optimization, not a requirement.
  }
}

initSqlitePragmas(prisma);

export { prisma };
