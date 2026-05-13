/**
 * Auth.js setup. Credentials provider with bcrypt verification.
 * Session strategy: JWT, 30-day expiry. The session carries the user's
 * tenantId and role so every Server Action can read them via
 * `getCurrentTenant()` without a database round-trip.
 *
 * Sign-in flow:
 *   1. `signIn('credentials', { email, password })` is called from the
 *      `loginAction` Server Action.
 *   2. `authorize()` looks up the user by email, verifies bcrypt, returns
 *      `{ id, email, name, tenantId, role }` (or null on failure).
 *   3. The `jwt` callback copies tenantId/role onto the JWT.
 *   4. The `session` callback exposes them on `session.user`.
 *
 * Email uniqueness: the schema's `users_tenant_email_uq` is per-tenant, but
 * we treat email as globally unique for login purposes in v1. The
 * `registerAction` rejects an email that already exists anywhere.
 */

import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from './db/client'
import { users } from './db/schema'
import { LoginInputSchema } from './zod-schemas'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      tenantId: string
      role: 'OWNER' | 'MANAGER' | 'VIEWER'
    } & DefaultSession['user']
  }

  interface User {
    tenantId?: string
    role?: 'OWNER' | 'MANAGER' | 'VIEWER'
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const parsed = LoginInputSchema.safeParse(raw)
        if (!parsed.success) return null

        const { email, password } = parsed.data
        const row = await db.query.users.findFirst({
          where: eq(users.email, email),
        })
        if (!row) return null

        const ok = await bcrypt.compare(password, row.passwordHash)
        if (!ok) return null

        // Best-effort last-login bump. Don't block sign-in on failure.
        db.update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, row.id))
          .catch(() => undefined)

        return {
          id: row.id,
          email: row.email,
          name: row.name,
          tenantId: row.tenantId,
          role: row.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        if ('tenantId' in user && user.tenantId) token.tenantId = user.tenantId
        if ('role' in user && user.role) token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.sub) session.user.id = token.sub
        const tenantId = (token as { tenantId?: string }).tenantId
        const role = (token as { role?: 'OWNER' | 'MANAGER' | 'VIEWER' }).role
        if (tenantId) session.user.tenantId = tenantId
        if (role) session.user.role = role
      }
      return session
    },
  },
})
