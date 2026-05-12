/**
 * Tenant scoping helpers. EVERY Server Action and route handler that touches
 * a tenant-owned row MUST start by calling `getCurrentTenant()`. There is no
 * Row-Level Security in v1 — isolation lives entirely in the query layer.
 */

import { redirect } from 'next/navigation'
import { auth } from './auth'

export type CurrentTenant = {
  tenantId: string
  userId: string
  role: 'OWNER' | 'MANAGER' | 'VIEWER'
}

export async function getCurrentTenant(): Promise<CurrentTenant> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return {
    tenantId: session.user.tenantId,
    userId: session.user.id,
    role: session.user.role,
  }
}

export async function requireOwner(): Promise<CurrentTenant> {
  const t = await getCurrentTenant()
  if (t.role !== 'OWNER') throw new Error('Owner-only action')
  return t
}

export async function requireWritable(): Promise<CurrentTenant> {
  const t = await getCurrentTenant()
  if (t.role === 'VIEWER') throw new Error('Read-only role')
  return t
}
