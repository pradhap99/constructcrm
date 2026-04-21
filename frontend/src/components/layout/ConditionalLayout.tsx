'use client'

import { usePathname } from 'next/navigation'
import { AppShell } from './AppShell'

const AUTH_PATHS = ['/login', '/register']

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (AUTH_PATHS.includes(pathname)) {
    return <>{children}</>
  }
  return <AppShell>{children}</AppShell>
}
