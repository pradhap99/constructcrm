/**
 * Auth.js setup. Skeleton for Phase 0 — full credentials provider, bcrypt
 * verification, and JWT session shape are wired in Phase 1 (auth + tenancy).
 *
 * The exported `auth` is consumed by `getCurrentTenant()` in lib/tenant.ts
 * and by the root API route handler `app/api/auth/[...nextauth]/route.ts`.
 */

import NextAuth, { type DefaultSession } from 'next-auth'

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
    // Credentials provider is wired in Phase 1.
  ],
})
