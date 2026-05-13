'use server'

import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { AuthError } from 'next-auth'
import { db } from '@/lib/db/client'
import { tenants, users } from '@/lib/db/schema'
import { signIn, signOut } from '@/lib/auth'
import { RegisterInputSchema, LoginInputSchema } from '@/lib/zod-schemas'
import { slugify, randomSuffix } from '@/lib/slug'

export type AuthState = { error?: string } | null

/**
 * Atomically creates a tenants row + the first OWNER users row, then signs
 * the new owner in. Email must be globally unique at the application layer
 * even though the underlying unique index is (tenantId, email).
 */
export async function registerAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = RegisterInputSchema.safeParse({
    firmName: formData.get('firmName'),
    ownerName: formData.get('ownerName'),
    email: formData.get('email'),
    password: formData.get('password'),
    gstNumber: formData.get('gstNumber'),
    panNumber: formData.get('panNumber'),
  })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const input = parsed.data

  const existing = await db.query.users.findFirst({
    where: eq(users.email, input.email),
    columns: { id: true },
  })
  if (existing) {
    return { error: 'An account with this email already exists' }
  }

  const passwordHash = await bcrypt.hash(input.password, 10)

  try {
    await db.transaction(async (tx) => {
      const baseSlug = slugify(input.firmName)
      const slug = await uniqueSlug(tx, baseSlug)

      const [tenant] = await tx
        .insert(tenants)
        .values({
          name: input.firmName,
          slug,
          gstNumber: input.gstNumber,
          panNumber: input.panNumber,
        })
        .returning({ id: tenants.id })

      if (!tenant) throw new Error('Failed to create tenant')

      await tx.insert(users).values({
        tenantId: tenant.id,
        email: input.email,
        name: input.ownerName,
        passwordHash,
        role: 'OWNER',
      })
    })
  } catch (error) {
    console.error('register error', error)
    return { error: 'Could not create your workspace. Please try again.' }
  }

  // signIn() throws a NEXT_REDIRECT internally; bubble it. Any AuthError means
  // the credentials were unexpectedly rejected — shouldn't happen post-insert.
  try {
    await signIn('credentials', {
      email: input.email,
      password: input.password,
      redirectTo: '/today',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Account created but sign-in failed. Try logging in.' }
    }
    throw error
  }

  return null
}

/** Email + password → session cookie. Errors render inline on the form. */
export async function loginAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = LoginInputSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid credentials' }
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: '/today',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Invalid email or password' }
    }
    throw error
  }

  return null
}

/** Clears the session cookie and bounces back to /login. */
export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: '/login' })
  redirect('/login')
}

/**
 * Returns a slug that is unique within the tenants table. Appends a short
 * random suffix on collision; gives up after 5 retries and falls back to a
 * fully random slug, which is acceptable because the slug only appears in
 * future workspace URLs and is editable in /settings.
 */
async function uniqueSlug(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  baseSlug: string,
): Promise<string> {
  let candidate = baseSlug
  for (let attempt = 0; attempt < 5; attempt++) {
    const hit = await tx.query.tenants.findFirst({
      where: eq(tenants.slug, candidate),
      columns: { id: true },
    })
    if (!hit) return candidate
    candidate = `${baseSlug.slice(0, 56)}-${randomSuffix(4)}`
  }
  return `firm-${randomSuffix(8)}`
}
