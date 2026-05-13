import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/**
 * Drizzle client wrapped in a lazy Proxy. The underlying postgres connection
 * is only created on first use, so:
 *   - Modules can import `db` without crashing when DATABASE_URL is unset
 *     (e.g. during `next build` page-data collection, or in unit tests
 *     that don't touch the database).
 *   - Tests that DO need a database use `createTestDb()` from
 *     `./test-client.ts` and never hit this module.
 */

type Db = PostgresJsDatabase<typeof schema>

let instance: Db | null = null

function realDb(): Db {
  if (instance) return instance
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Add it to .env.local for `pnpm dev`, or to your deployment environment.',
    )
  }
  const client = postgres(url, { max: 10, prepare: false })
  instance = drizzle(client, { schema })
  return instance
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const value = Reflect.get(realDb() as object, prop, receiver) as unknown
    return typeof value === 'function' ? (value as Function).bind(realDb()) : value
  },
})

export { schema }
