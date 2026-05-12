import type { Config } from 'drizzle-kit'

/**
 * drizzle-kit reads DATABASE_URL from the environment for `migrate`, `push`,
 * and `studio`. `generate` only needs the schema. Set DATABASE_URL in your
 * shell (or .env.local) before running migrate/push/studio.
 */
export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://placeholder',
  },
  strict: true,
  verbose: true,
} satisfies Config
