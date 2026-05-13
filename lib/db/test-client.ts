/**
 * Test database factory. Wraps an in-process Postgres (pglite) with the
 * production Drizzle schema and applies the existing on-disk migration so
 * tests run against the same DDL that ships to production.
 *
 * Used by `lib/__tests__/tenant-isolation.integration.test.ts`. Not imported
 * from any non-test code.
 */

import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import * as schema from './schema.ts'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = path.join(HERE, 'migrations')

export type TestDb = {
  db: ReturnType<typeof drizzle<typeof schema>>
  pg: PGlite
  close: () => Promise<void>
}

export async function createTestDb(): Promise<TestDb> {
  const pg = new PGlite()
  const db = drizzle(pg, { schema })
  await applyMigrations(pg)
  return {
    db,
    pg,
    close: () => pg.close(),
  }
}

async function applyMigrations(pg: PGlite): Promise<void> {
  // pglite ships Postgres 16, which provides `gen_random_uuid()` as a core
  // function — no extension needed.
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
    for (const stmt of splitStatements(sql)) {
      await pg.exec(stmt)
    }
  }
}

/** Drizzle marks statement boundaries with `--> statement-breakpoint`. */
function splitStatements(sql: string): string[] {
  return sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean)
}
